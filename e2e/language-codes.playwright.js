// Run through Playwright MCP against an isolated Vite server on port 5178.
// API responses are local fixtures only; no live service is contacted.
async page => {
  const origin = 'http://127.0.0.1:5178';
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });

  const results = [];
  const codes = ['RU', 'UZ', 'EN'];
  const checkDropdown = async (trigger, context) => {
    await trigger.click();
    const menu = page.locator('[role="menu"]').last();
    await menu.waitFor({ state: 'visible' });
    const dimensions = await Promise.all([
      trigger.boundingBox(), menu.boundingBox(),
    ]);
    const [triggerBox, menuBox] = dimensions;
    if (!triggerBox || !menuBox || Math.abs(triggerBox.width - menuBox.width) > 1) {
      throw new Error(`${context}: menu width must match trigger within 1px: ${JSON.stringify({ triggerBox, menuBox })}`);
    }

    const options = menu.locator('[role="menuitemradio"]');
    const texts = (await options.allTextContents()).map(text => text.replace(/\s+/g, '').toUpperCase());
    if (texts.length !== 3 || texts.some(text => !codes.some(code => text === code))) {
      throw new Error(`${context}: expected only RU/UZ/EN option labels, got ${JSON.stringify(texts)}`);
    }

    const current = (await trigger.innerText()).match(/\b(RU|UZ|EN)\b/i)?.[1].toUpperCase();
    const active = menu.locator('[role="menuitemradio"][aria-checked="true"]');
    if (await active.count() !== 1 || (await active.innerText()).replace(/\s+/g, '').toUpperCase() !== current) {
      throw new Error(`${context}: active radio does not match trigger ${current}`);
    }

    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'detached' });
    if (!await trigger.evaluate(el => el === document.activeElement)) {
      throw new Error(`${context}: Escape did not restore focus to language trigger`);
    }

    for (const code of codes) {
      await trigger.click();
      const before = await page.locator('body').innerText();
      await menu.locator(`[role="menuitemradio"]`).filter({ hasText: new RegExp(`\\b${code}\\b`) }).click();
      await page.waitForFunction(expected => localStorage.getItem('i18nextLng') === expected, code.toLowerCase());
      await page.waitForFunction(expected => {
        const button = [...document.querySelectorAll('button[aria-haspopup="menu"]')].find(el => el.innerText.trim().toUpperCase() === expected);
        return Boolean(button);
      }, code);
      const after = await page.locator('body').innerText();
      if (code !== current && before === after) throw new Error(`${context}: selecting ${code} did not change visible interface text`);
      results.push({ ...context, selected: code, interfaceChanged: true });
    }
  };

  // Login language picker: cover both required viewport sizes and themes.
  for (const width of [375, 1440]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/login`);
      await page.evaluate(value => localStorage.setItem('averon-admin-theme', value), theme);
      await page.reload();
      const trigger = page.locator('header button[aria-haspopup="menu"]').first();
      await trigger.waitFor({ state: 'visible' });
      await checkDropdown(trigger, { surface: 'login', width, theme });
    }
  }

  // Authenticated desktop header language picker.
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin);
    await page.evaluate(value => {
      localStorage.setItem('averon-admin-theme', value);
      localStorage.setItem('i18nextLng', 'ru');
    }, theme);
    await page.reload();
    const trigger = page.locator('[data-action-id="admin.header.language-indicator"]').locator('xpath=ancestor::button');
    await trigger.waitFor({ state: 'visible' });
    await checkDropdown(trigger, { surface: 'desktop-header', width: 1440, theme });
  }

  // Mobile drawer language picker at 375px in both themes.
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto(origin);
    await page.evaluate(value => {
      localStorage.setItem('averon-admin-theme', value);
      localStorage.setItem('i18nextLng', 'ru');
    }, theme);
    await page.reload();
    await page.locator('[data-action-id="admin.sidebar.toggle-mobile-navigation"]').click();
    const trigger = page.locator('[data-admin-mobile-utilities] button[aria-haspopup="menu"]');
    await trigger.waitFor({ state: 'visible' });
    await checkDropdown(trigger, { surface: 'mobile-sidebar', width: 375, theme });
  }

  return results;
}
