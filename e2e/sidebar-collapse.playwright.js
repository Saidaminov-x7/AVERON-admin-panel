// Run with Playwright MCP browser_run_code_unsafe against the isolated local Vite server.
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
  for (const locale of ['ru', 'uz', 'en']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin);
    await page.evaluate(value => {
      localStorage.setItem('i18nextLng', value);
      localStorage.setItem('averon-admin-sidebar-collapsed', 'false');
    }, locale);
    await page.reload();

    const sidebar = page.locator('aside.admin-sidebar');
    const promoLink = sidebar.locator('nav a[href="/commerce/promo-codes"]');
    const promoIconClass = await promoLink.locator('svg.lucide-badge-percent').getAttribute('class');
    if (!promoIconClass?.includes('lucide-badge-percent')) throw new Error(`Promo icon missing: ${locale} (${promoIconClass})`);

    const expandedWidth = await sidebar.evaluate(element => element.getBoundingClientRect().width);
    await page.locator('[data-action-id="admin.sidebar.toggle-collapse"]:visible').last().click();
    await page.waitForTimeout(240);
    const collapsed = await sidebar.evaluate(element => ({
      width: element.getBoundingClientRect().width,
      linkWidth: element.querySelector('nav a').getBoundingClientRect().width,
      labelOpacity: getComputedStyle(element.querySelector('.admin-sidebar-label')).opacity,
      labelWidth: element.querySelector('.admin-sidebar-label').getBoundingClientRect().width,
      overflow: document.documentElement.scrollWidth > innerWidth,
      stored: localStorage.getItem('averon-admin-sidebar-collapsed'),
    }));
    if (expandedWidth < 230 || collapsed.width !== 64 || collapsed.linkWidth !== 44 || collapsed.labelOpacity !== '0' || collapsed.labelWidth !== 0 || collapsed.overflow || collapsed.stored !== 'true') {
      throw new Error(`Collapse state mismatch ${locale}: ${JSON.stringify(collapsed)}`);
    }

    await page.locator('[data-action-id="admin.sidebar.toggle-collapse"]:visible').first().click();
    await page.waitForTimeout(240);
    const expanded = await sidebar.evaluate(element => ({
      width: element.getBoundingClientRect().width,
      labelOpacity: getComputedStyle(element.querySelector('.admin-sidebar-label')).opacity,
      stored: localStorage.getItem('averon-admin-sidebar-collapsed'),
    }));
    if (expanded.width < 230 || expanded.labelOpacity !== '1' || expanded.stored !== 'false') throw new Error(`Expand state mismatch ${locale}: ${JSON.stringify(expanded)}`);
    results.push({ locale, expandedWidth, collapsed, expanded });
  }

  return { passed: results.length, results };
}
