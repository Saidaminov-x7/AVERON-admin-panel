// Run with Playwright MCP against isolated Vite on port 5178.
async page => {
  await page.unrouteAll({ behavior: 'wait' });
  let revocations = 0;
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() === 'DELETE' && path.endsWith('/admin/users/fixture/sessions/s')) { revocations++; return route.fulfill({ status: 204 }); }
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    if (path.endsWith('/admin/users/fixture')) return route.fulfill({ json: { id: 'fixture', name: 'Test', email: 'test@example.invalid', role: 'USER', createdAt: '2026-01-01T00:00:00Z', isBlocked: false } });
    if (path.endsWith('/admin/users/fixture/sessions')) return route.fulfill({ json: [{ id: 's', userAgent: 'Fixture', lastSeenAt: '2026-01-01T00:00:00Z' }] });
    return route.fulfill({ json: { items: [], total: 0 } });
  });
  const results = [];
  for (const theme of ['light', 'dark']) for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:5178/users/fixture');
    await page.evaluate(({theme,locale}) => { localStorage.setItem('averon-admin-theme', theme); localStorage.setItem('i18nextLng', locale); }, {theme,locale});
    await page.reload();
    await page.locator('#user-profile-tab-sessions').click();
    const button = page.locator('#user-profile-panel-sessions button');
    await button.waitFor();
    for (const state of ['normal', 'hover', 'focus']) {
      if (state === 'hover') await button.hover();
      if (state === 'focus') await button.focus();
      await page.waitForTimeout(250);
      const colors = await button.evaluate(el => ({ fg: getComputedStyle(el.querySelector('svg')).color, bg: getComputedStyle(el).backgroundColor }));
      const lum = value => { const c = value.match(/[\d.]+/g).slice(0, 3).map(Number).map(n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; }); return .2126*c[0] + .7152*c[1] + .0722*c[2]; };
      const a = lum(colors.fg), b = lum(colors.bg), ratio = (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      results.push({theme, locale, width, state, ...colors, ratio});
      if (ratio < 3) throw new Error(JSON.stringify(results));
    }
    const before = revocations;
    await button.click();
    await page.waitForTimeout(100);
    if (revocations !== before + 1) throw new Error(`Session action did not send fixture request: ${locale}/${width}`);
  }
  return results;
}
