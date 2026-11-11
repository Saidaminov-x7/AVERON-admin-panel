// Run with Playwright MCP browser_run_code_unsafe against isolated local Vite.
// Verifies that the sidebar has no decorative chevrons and that route links still work.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const paths = [
    '/', '/imports', '/products', '/categories', '/media', '/reviews', '/orders',
    '/finance', '/commerce/promo-codes', '/users', '/analytics', '/notifications',
    '/audit-log', '/visual-search/audit', '/error-logs', '/settings/general',
    '/system/health', '/system/integrations',
  ];

  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });

  const results = [];
  const assertNoOverflow = async label => {
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth > innerWidth,
      sidebar: [...document.querySelectorAll('aside.admin-sidebar')].some(sidebar => sidebar.scrollWidth > sidebar.clientWidth + 1),
    }));
    if (overflow.document || overflow.sidebar) throw new Error(`${label}: overflow ${JSON.stringify(overflow)}`);
  };
  const assertNoChevron = async (link, label) => {
    const found = await link.evaluate(element => {
      const svgs = [...element.querySelectorAll('svg')];
      return svgs.filter(svg => /chevron.?right/i.test(svg.getAttribute('class') || '')
        || svg.hasAttribute('data-sidebar-chevron')
        || svg.classList.contains('admin-mobile-link-chevron'))
        .map(svg => svg.getAttribute('class') || '<unclassed chevron>');
    });
    if (found.length) throw new Error(`${label}: chevron still rendered (${found.join(', ')})`);
  };
  const setScenario = async (locale, theme, collapsed) => {
    await page.goto(origin);
    await page.evaluate(({ localeValue, themeValue, collapsedValue }) => {
      localStorage.setItem('i18nextLng', localeValue);
      localStorage.setItem('averon-admin-theme', themeValue);
      localStorage.setItem('averon-admin-sidebar-collapsed', String(collapsedValue));
    }, { localeValue: locale, themeValue: theme, collapsedValue: collapsed });
    await page.reload();
  };

  for (const locale of ['ru', 'uz', 'en']) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await setScenario(locale, theme, false);
      const sidebar = page.locator('aside.admin-sidebar');
      const routeLinks = sidebar.locator('nav a.admin-drawer-link[href]');
      if (await routeLinks.count() !== paths.length) {
        throw new Error(`${locale}/${theme}/desktop expanded: expected ${paths.length} route links, got ${await routeLinks.count()}`);
      }
      for (const path of paths) {
        const link = sidebar.locator(`nav a.admin-drawer-link[href="${path}"]`);
        if (await link.count() !== 1) throw new Error(`${locale}/${theme}: missing/duplicate sidebar link ${path}`);
        await assertNoChevron(link, `${locale}/${theme}/desktop expanded ${path}`);
      }
      const profile = sidebar.locator('[data-admin-drawer-footer] a[href="/profile"]');
      if (await profile.count() !== 1) throw new Error(`${locale}/${theme}/desktop: missing profile link`);
      await assertNoChevron(profile, `${locale}/${theme}/desktop profile`);
      await assertNoOverflow(`${locale}/${theme}/desktop expanded`);
      results.push({ locale, theme, viewport: 'desktop-1440', state: 'expanded', links: paths.length + 1 });

      // Exercise every route link; clicking a link must reach its intended page.
      for (const path of paths) {
        await sidebar.locator(`nav a.admin-drawer-link[href="${path}"]`).click();
        await page.waitForURL(url => url.pathname === path);
        if (new URL(page.url()).pathname !== path) throw new Error(`${locale}/${theme}: navigation to ${path} failed`);
      }
      await profile.click();
      await page.waitForURL(url => url.pathname === '/profile');
      if (new URL(page.url()).pathname !== '/profile') throw new Error(`${locale}/${theme}: profile navigation failed`);

      await page.locator('[data-action-id="admin.sidebar.toggle-collapse"]:visible').last().click();
      for (const path of paths) {
        const link = sidebar.locator(`nav a.admin-drawer-link[href="${path}"]`);
        await assertNoChevron(link, `${locale}/${theme}/desktop collapsed ${path}`);
        const width = await link.evaluate(element => element.getBoundingClientRect().width);
        if (Math.abs(width - 44) > 1) throw new Error(`${locale}/${theme}/desktop collapsed ${path}: expected 44px link, got ${width}px`);
      }
      await assertNoChevron(profile, `${locale}/${theme}/desktop collapsed profile`);
      await assertNoOverflow(`${locale}/${theme}/desktop collapsed`);
      results.push({ locale, theme, viewport: 'desktop-1440', state: 'collapsed', links: paths.length + 1 });

      await page.setViewportSize({ width: 375, height: 812 });
      await setScenario(locale, theme, false);
      await page.locator('[data-action-id="admin.sidebar.toggle-mobile-navigation"]').click();
      const mobileLinks = page.locator('.admin-mobile-navigation.is-open aside.admin-sidebar nav a.admin-drawer-link[href]');
      if (await mobileLinks.count() !== paths.length) throw new Error(`${locale}/${theme}/mobile: expected ${paths.length} route links, got ${await mobileLinks.count()}`);
      for (const path of paths) {
        const link = page.locator(`.admin-mobile-navigation.is-open aside.admin-sidebar nav a.admin-drawer-link[href="${path}"]`);
        await assertNoChevron(link, `${locale}/${theme}/mobile ${path}`);
      }
      const mobileProfile = page.locator('.admin-mobile-navigation.is-open [data-admin-drawer-footer] a[href="/profile"]');
      if (await mobileProfile.count() !== 1) throw new Error(`${locale}/${theme}/mobile: missing profile link`);
      await assertNoChevron(mobileProfile, `${locale}/${theme}/mobile profile`);
      const site = page.locator('.admin-mobile-navigation.is-open [data-admin-mobile-utilities] a[href]');
      if (await site.count() !== 1) throw new Error(`${locale}/${theme}/mobile: expected one site utility link`);
      await assertNoChevron(site, `${locale}/${theme}/mobile site`);
      await assertNoOverflow(`${locale}/${theme}/mobile`);
      results.push({ locale, theme, viewport: 'mobile-375', state: 'open', links: paths.length + 2 });

      // Confirm a mobile route link still navigates and closes the drawer.
      await page.locator(`.admin-mobile-navigation.is-open aside.admin-sidebar nav a.admin-drawer-link[href="/products"]`).click();
      await page.waitForURL(url => url.pathname === '/products');
      if (new URL(page.url()).pathname !== '/products') throw new Error(`${locale}/${theme}/mobile: navigation to /products failed`);
    }
  }
  return { passed: results.length, results };
}
