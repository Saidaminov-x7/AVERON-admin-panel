// Run with Playwright MCP browser_run_code_unsafe against isolated local Vite.
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
  for (const width of [320, 375, 390, 768, 1023]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin);
    await page.evaluate(() => {
      localStorage.setItem('averon-admin-theme', 'dark');
      localStorage.setItem('i18nextLng', 'ru');
    });
    await page.reload();
    await page.locator('[data-action-id="admin.sidebar.toggle-mobile-navigation"]').click();
    await page.waitForFunction(() => {
      const panel = document.querySelector('.admin-mobile-navigation aside.admin-sidebar');
      return panel && getComputedStyle(panel).translate === '0px';
    });
    await page.waitForTimeout(50);
    const layout = await page.evaluate(() => {
      const drawer = document.querySelector('.admin-mobile-navigation');
      const brand = drawer.querySelector('.admin-sidebar-brand');
      const brandBounds = brand.getBoundingClientRect();
      const logoBounds = brand.querySelector('.admin-mobile-brand').getBoundingClientRect();
      const labelBounds = brand.querySelector('.admin-mobile-brand-label').getBoundingClientRect();
      const panel = drawer.querySelector('aside.admin-sidebar');
      const panelBounds = panel.getBoundingClientRect();
      const center = brandBounds.top + brandBounds.height / 2;
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        panelPosition: getComputedStyle(panel).position,
        panelMargins: { top: panelBounds.top, right: innerWidth - panelBounds.right, bottom: innerHeight - panelBounds.bottom, left: panelBounds.left },
        panelWidth: panelBounds.width,
        panelBackground: getComputedStyle(panel).backgroundColor,
        surfaceToken: getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim(),
        headerCenter: center,
        logoOffset: Math.abs(logoBounds.top + logoBounds.height / 2 - center),
        adminOffset: Math.abs(labelBounds.top + labelBounds.height / 2 - center),
        notificationShortcut: Boolean(drawer.querySelector('[data-admin-mobile-utilities] a[href="/notifications"]')),
        profileHref: drawer.querySelector('[data-admin-drawer-footer] a')?.getAttribute('href'),
        logoutCount: drawer.querySelectorAll('[data-admin-drawer-footer] button[aria-label]').length,
        footerPaddingBottom: Number.parseFloat(getComputedStyle(drawer.querySelector('[data-admin-drawer-footer]')).paddingBottom),
        languageArrow: Boolean(drawer.querySelector('[data-admin-mobile-utilities] button[aria-haspopup="menu"] svg')),
        theme: document.documentElement.classList.contains('dark'),
        bodyOverflow: getComputedStyle(document.body).overflow,
      };
    });
    const phoneWidth = width < 768;
    const expectedPanelWidth = phoneWidth ? width : Math.min(width - 28, 400);
    const horizontalMarginsAreWrong = phoneWidth
      ? Math.abs(layout.panelMargins.left) > 1 || Math.abs(layout.panelMargins.right) > 1
      : layout.panelMargins.left < 14 || layout.panelMargins.right < 14;
    if (layout.overflow || layout.panelPosition !== 'absolute' || Math.abs(layout.panelMargins.top) > 1 || Math.abs(layout.panelMargins.bottom) > 1 || horizontalMarginsAreWrong || layout.panelWidth !== expectedPanelWidth || layout.panelBackground !== 'rgb(30, 30, 30)' || layout.notificationShortcut || layout.profileHref !== '/profile' || layout.logoutCount !== 1 || !layout.theme || layout.bodyOverflow !== 'hidden' || layout.logoOffset > 1 || layout.adminOffset > 1 || layout.footerPaddingBottom < 20 || layout.languageArrow) {
      throw new Error(`Mobile drawer layout failed at ${width}px: ${JSON.stringify(layout)}`);
    }

    const languageTrigger = page.locator('[data-admin-mobile-utilities] button[aria-haspopup="menu"]');
    await languageTrigger.click();
    const languageOptions = await page.locator('[role="menu"] [role="menuitemradio"]').allTextContents();
    if (languageOptions.length !== 3 || !languageOptions.join(' ').includes('RU') || !languageOptions.join(' ').includes('UZ') || !languageOptions.join(' ').includes('EN')) {
      throw new Error(`Mobile language dropdown mismatch: ${JSON.stringify(languageOptions)}`);
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const closeButton = page.locator('[data-action-id="admin.sidebar.close-mobile-navigation"]');
    const visibleControls = page.locator('.admin-mobile-navigation a[href], .admin-mobile-navigation button:not(:disabled)');
    await visibleControls.first().focus();
    await page.keyboard.press('Shift+Tab');
    if (!await page.locator('[data-admin-drawer-footer] button[aria-label]').evaluate((el) => el === document.activeElement)) {
      throw new Error(`Shift+Tab did not wrap focus at ${width}px`);
    }
    await page.locator('[data-admin-drawer-footer] button[aria-label]').focus();
    await page.keyboard.press('Tab');
    if (!await visibleControls.first().evaluate((el) => el === document.activeElement)) throw new Error(`Tab did not wrap focus at ${width}px`);

    await page.locator('[data-admin-drawer-footer] a[href="/profile"]').click();
    await page.waitForURL('**/profile');
    if (await page.evaluate(() => getComputedStyle(document.body).overflow) === 'hidden') throw new Error(`Profile navigation left scroll locked at ${width}px`);

    await page.locator('[data-action-id="admin.sidebar.toggle-mobile-navigation"]').click();
    await page.locator('button.fixed.inset-0').click({ position: { x: 3, y: 3 } });
    await page.waitForTimeout(350);
    if (await page.evaluate(() => getComputedStyle(document.body).overflow) === 'hidden' || await page.locator('.admin-mobile-navigation').getAttribute('data-open') !== 'false') {
      throw new Error(`Backdrop close left drawer or scroll lock open at ${width}px`);
    }

    await page.locator('[data-action-id="admin.sidebar.toggle-mobile-navigation"]').click();
    await page.locator('[data-action-id="admin.sidebar.close-mobile-navigation"]').click();
    await page.waitForTimeout(350);
    if (await page.evaluate(() => getComputedStyle(document.body).overflow) === 'hidden' || await page.locator('.admin-mobile-navigation').getAttribute('data-open') !== 'false') {
      throw new Error(`Close button left drawer or scroll lock open at ${width}px`);
    }
    results.push({ width, ...layout, languageOptions, profileNavigation: true, focusWrap: true, backdropClose: true, closeButton: true });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin);
  await page.evaluate(() => localStorage.setItem('i18nextLng', 'en'));
  await page.reload();
  const headerLanguage = page.locator('[data-action-id="admin.header.language-indicator"]');
  if (!(await headerLanguage.innerText()).includes('EN')) throw new Error('Desktop language code missing');
  if (await headerLanguage.locator('svg').count()) throw new Error('Desktop language trigger should not show an arrow icon');
  await headerLanguage.click();
  const desktopOptions = await page.locator('[role="menu"] button[data-action-id^="admin.header.select-language"]').count();
  if (desktopOptions !== 3) throw new Error(`Desktop dropdown should contain RU/UZ/EN, got ${desktopOptions}`);
  await page.locator('[data-action-id="admin.header.select-language.uz"]').click();
  await page.waitForTimeout(150);
  if ((await page.locator('[data-action-id="admin.header.language-indicator"]').innerText()).trim().split(/\s+/)[0] !== 'UZ') throw new Error('Desktop language selection failed');
  return { mobile: results, desktopDropdownOptions: desktopOptions, desktopSelection: 'UZ' };
}
