// Run through Playwright MCP against the isolated Vite server on port 5178.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const date = '2026-11-12T10:00:00.000Z';
  let healthMode = 'error';
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    if (path.endsWith('/media')) return route.fulfill({ json: { items: [{ id: 'media-1', url: 'https://example.invalid/image.png', ownerId: 'fixture', mimeType: 'image/png', size: 1, hash: 'fixture', createdAt: date, updatedAt: date }], meta: { total: 25, page: 1, limit: 24, totalPages: 2, totalBytes: 1 } } });
    if (path.endsWith('/admin/users')) return route.fulfill({ json: { items: [{ id: 'user-1', name: 'Fixture user', email: 'fixture@example.invalid', phone: '', role: 'USER', verified: true, isBlocked: false, blockedAt: null, blockedReason: null, createdAt: date, avatar: null }], total: 1, page: 1, limit: 15, totalPages: 1, meta: { total: 1, page: 1, limit: 15, totalPages: 1 } } });
    if (path.endsWith('/admin/audit-logs')) return route.fulfill({ json: [{ id: 'audit-1', action: 'USER_BLOCKED', resource: 'user', resourceId: 'fixture', meta: { reason: 'Fixture detail' }, timestamp: date, user: { id: 'fixture', name: 'Fixture admin', email: 'fixture@example.invalid' } }] });
    if (path.endsWith('/admin/system/health')) return healthMode === 'healthy'
      ? route.fulfill({ json: { status: 'HEALTHY', uptimeSeconds: 3661, backend: { status: 'UP', latencyMs: 42 }, database: { status: 'UP', latencyMs: 3 }, redis: { status: 'UP', latencyMs: 2 }, memory: { rssMb: 80, heapUsedMb: 40, heapTotalMb: 100, heapUsagePercent: 40 }, nodeVersion: 'fixture', timestamp: date } })
      : route.fulfill({ status: 503, json: { error: 'fixture backend unavailable' } });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });

  const results = [];
  for (const [path, expected] of [['/media', '24'], ['/users', '15'], ['/audit-log', '15']]) {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(origin);
      await page.evaluate(() => { localStorage.setItem('i18nextLng', 'ru'); localStorage.setItem('averon-admin-theme', 'light'); });
      await page.reload();
      await page.goto(`${origin}${path}`);
      const trigger = page.locator('button[aria-haspopup="listbox"][aria-label="Показывать на странице"]');
      await trigger.waitFor({ state: 'visible' });
      if (!(await trigger.innerText()).trim().startsWith(expected)) throw new Error(`${path}/${width}: expected selected size ${expected}, got ${await trigger.innerText()}`);
      await trigger.click();
      const menu = page.locator('[role="listbox"]').last();
      await menu.waitFor({ state: 'visible' });
      const optionValues = await menu.locator('[role="option"] span.truncate').allTextContents();
      if (!['10', '20', '50', '100', expected].every(value => optionValues.includes(value))) throw new Error(`${path}/${width}: expected standard sizes and current value ${expected}, got ${JSON.stringify(optionValues)}`);
      const [triggerBox, menuBox] = await Promise.all([trigger.boundingBox(), menu.boundingBox()]);
      if (!triggerBox || !menuBox || Math.abs(triggerBox.width - menuBox.width) > 1) throw new Error(`${path}/${width}: dropdown width mismatch ${JSON.stringify({ triggerBox, menuBox })}`);
      await page.keyboard.press('Escape');
      results.push({ path, width, selected: expected, menuWidth: menuBox.width });
    }
  }

  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(origin);
    await page.evaluate(themeValue => { localStorage.setItem('i18nextLng', 'ru'); localStorage.setItem('averon-admin-theme', themeValue); }, theme);
    await page.reload();
    await page.goto(`${origin}/audit-log`);
    await page.getByRole('button', { name: /Детали/ }).first().click();
    const pre = page.locator('pre').last();
    await pre.waitFor({ state: 'visible' });
    const detailStyles = await pre.evaluate(el => {
      const probe = document.createElement('span');
      probe.style.backgroundColor = 'var(--color-surface)';
      document.body.append(probe);
      const surface = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { background: getComputedStyle(el).backgroundColor, surface, color: getComputedStyle(el).color, classes: el.className };
    });
    if (detailStyles.classes.includes('bg-gray-900') || detailStyles.classes.includes('text-emerald-400') || detailStyles.background !== detailStyles.surface) throw new Error(`Audit details do not follow ${theme} theme tokens: ${JSON.stringify(detailStyles)}`);
    results.push({ path: '/audit-log', theme, details: detailStyles });
  }

  await page.goto(`${origin}/system/health`);
  await page.getByText(/Не удалось получить состояние сервисов/).waitFor({ state: 'visible' });
  const skeletons = await page.locator('[aria-label="Загрузка..."] .animate-pulse').count();
  if (skeletons !== 0) throw new Error(`System health skeletons remained after API error: ${skeletons}`);
  if (await page.getByText('DOWN').count() < 3) throw new Error('Expected service status cards to show DOWN after API failure');
  results.push({ path: '/system/health', state: 'API error displayed; skeletons replaced by DOWN service cards' });
  healthMode = 'healthy';
  await page.reload();
  await page.getByText('42 ms').waitFor({ state: 'visible' });
  if (await page.locator('[aria-label="Загрузка..."] .animate-pulse').count() !== 0) throw new Error('System health skeletons remained after successful API response');
  if (await page.getByText('UP', { exact: true }).count() < 3) throw new Error('Expected successful system health fixture values to render');
  results.push({ path: '/system/health', state: 'success response rendered 42ms/UP metrics; skeletons removed' });
  return results;
}
