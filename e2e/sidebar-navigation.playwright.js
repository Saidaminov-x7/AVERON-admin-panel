// Run with Playwright MCP browser_run_code_unsafe against isolated local Vite.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const paths = ['/', '/imports', '/products', '/categories', '/media', '/reviews', '/orders', '/finance', '/commerce/promo-codes', '/users', '/analytics', '/notifications', '/audit-log', '/visual-search/audit', '/error-logs', '/settings/general', '/system/health', '/system/integrations'];
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });
  await page.setViewportSize({ width: 375, height: 900 });
  const results = [];
  for (const locale of ['ru', 'uz', 'en']) {
    await page.goto(origin);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    for (const path of paths) {
      await page.goto(origin);
      await page.locator('[data-action-id="admin.sidebar.toggle-mobile-navigation"]').click();
      await page.locator('aside nav a').filter({ has: page.locator(`xpath=self::a[@href="${path}"]`) }).click();
      await page.waitForTimeout(400);
      const actual = new URL(page.url()).pathname;
      const expanded = await page.locator('button[aria-expanded]:visible').first().getAttribute('aria-expanded');
      const bodyOverflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
      if (actual !== path || expanded === 'true' || bodyOverflow === 'hidden') {
        throw new Error(`Sidebar navigation failed: ${locale} ${path} ${actual} ${expanded} ${bodyOverflow}`);
      }
      results.push(`${locale}/${path}`);
    }
  }
  return { passed: results.length, results };
}
