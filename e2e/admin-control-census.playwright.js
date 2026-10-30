// Route/control census for all supported locales and desktop/mobile widths.
// Run with Playwright MCP browser_run_code_unsafe against isolated local Vite.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const routes = ['/', '/imports', '/products', '/products/new', '/products/edit/fixture', '/categories', '/media', '/reviews', '/orders', '/finance', '/commerce/promo-codes', '/users', '/users/fixture-user', '/analytics', '/notifications', '/audit-log', '/visual-search/audit', '/error-logs', '/profile', '/settings', '/settings/general', '/settings/staff', '/system/health', '/system/integrations', '/not-found-audit'];
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });

  const observed = { states: 0, buttons: 0, links: 0, fields: 0, forms: 0, dropdownTriggers: 0, dropdownOpenCloseChecks: 0 };
  const failures = [];
  for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) for (const path of routes) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(25);
    const state = await page.evaluate(() => {
      const visible = (el) => !!(el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none');
      const selectors = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="switch"], [role="tab"], [role="combobox"]';
      const controls = [...document.querySelectorAll(selectors)].filter(visible);
      const viewport = { width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
      const bounds = controls.map((el) => {
        const rect = el.getBoundingClientRect();
        const name = el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText?.trim() || el.value || '';
        return { tag: el.tagName, role: el.getAttribute('role'), name: name.slice(0, 60), x: rect.x, right: rect.right, width: rect.width, inViewportX: rect.x >= -1 && rect.right <= innerWidth + 1, dropdown: el.getAttribute('aria-haspopup') === 'menu' };
      });
      return { viewport, buttons: controls.filter(el => el.matches('button,[role="button"]')).length, links: controls.filter(el => el.matches('a[href]')).length, fields: controls.filter(el => el.matches('input,textarea,select,[role="combobox"]')).length, forms: document.forms.length, dropdowns: controls.filter(el => el.getAttribute('aria-haspopup') === 'menu').length, unlabeled: bounds.filter(el => el.tag === 'BUTTON' && !el.name), outOfBounds: bounds.filter(el => !el.inViewportX) };
    });
    observed.states++;
    observed.buttons += state.buttons;
    observed.links += state.links;
    observed.fields += state.fields;
    observed.forms += state.forms;
    observed.dropdownTriggers += state.dropdowns;
    if (state.viewport.scrollWidth > state.viewport.width || state.unlabeled.length || state.outOfBounds.length) failures.push({ locale, width, path, ...state });
    for (let index = 0; index < state.dropdowns; index++) {
      const trigger = page.locator('button[aria-haspopup="menu"]:visible').nth(index);
      await trigger.click();
      const menu = page.locator('[role="menu"]:visible').last();
      if (!(await menu.count())) {
        failures.push({ locale, width, path, dropdown: index, error: 'menu did not open' });
        continue;
      }
      await page.keyboard.press('Escape');
      if (await page.locator('[role="menu"]:visible').count()) failures.push({ locale, width, path, dropdown: index, error: 'Escape did not close menu' });
      observed.dropdownOpenCloseChecks++;
    }
  }
  if (failures.length) throw new Error(JSON.stringify({ observed, failures: failures.slice(0, 15) }));
  return { observed, failures: 0 };
}
