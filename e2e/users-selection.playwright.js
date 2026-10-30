// Run via Playwright MCP against the isolated local Vite server.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const user = { id: 'fixture-user', name: 'Test User', email: 'test@example.invalid', phone: '', role: 'USER', adminRole: null, verified: true, isBlocked: false, blockedAt: null, blockedReason: null, createdAt: '2026-01-01T00:00:00Z', avatar: null };
  const users = [user, { ...user, id: 'fixture-user-2', name: 'Test Second' }];
  const allNames = { ru: 'Выбрать всех пользователей на странице', uz: 'Sahifadagi barcha foydalanuvchilarni tanlash', en: 'Select all users on this page' };
  const userNames = { ru: 'Выбрать пользователя Test User', uz: 'Test User foydalanuvchisini tanlash', en: 'Select user Test User' };
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    if (request.method() === 'GET' && path.endsWith('/admin/users')) return route.fulfill({ json: { items: users, total: 2, page: 1, limit: 20, totalPages: 1 } });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });
  const results = [];
  for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/users`);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.reload();
    await page.getByText('Test User').waitFor();
    const all = page.getByRole('button', { name: allNames[locale] });
    const first = page.getByRole('button', { name: userNames[locale] });
    const rows = page.locator('tbody button[aria-pressed]');
    await first.focus();
    await page.keyboard.press('Space');
    if (await first.getAttribute('aria-pressed') !== 'true' || await all.getAttribute('aria-pressed') !== 'false') throw new Error(`Partial selection: ${locale} ${width}`);
    await all.click();
    if (await all.getAttribute('aria-pressed') !== 'true' || await rows.nth(1).getAttribute('aria-pressed') !== 'true') throw new Error(`Select all: ${locale} ${width}`);
    await all.click();
    if (await all.getAttribute('aria-pressed') !== 'false' || await first.getAttribute('aria-pressed') !== 'false' || await rows.nth(1).getAttribute('aria-pressed') !== 'false') throw new Error(`Clear all: ${locale} ${width}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Page overflow: ${locale} ${width}`);
    results.push(`${locale}/${width}`);
  }
  return { passed: results.length, results };
}
