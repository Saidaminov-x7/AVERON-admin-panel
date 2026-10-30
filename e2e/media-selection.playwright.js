// Run via Playwright MCP against the isolated local Vite server.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const item = { id: 'test-media', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', ownerId: 'test', mimeType: 'image/png', size: 68, hash: 'test', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
  const names = { ru: 'Выбрать файл test-media', uz: 'test-media faylini tanlash', en: 'Select file test-media' };
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    if (request.method() === 'GET' && path.endsWith('/media')) return route.fulfill({ json: { items: [item], meta: { total: 1, page: 1, limit: 24, totalPages: 1, totalBytes: 68 } } });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });
  const passed = [];
  for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) for (const mode of ['grid', 'list']) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/media`);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.reload();
    await page.locator('img[alt="test-media"]').waitFor();
    if (mode === 'list') await page.locator('button:has(svg.lucide-list)').click();
    const button = page.getByRole('button', { name: names[locale] });
    if (await button.getAttribute('aria-pressed') !== 'false') throw new Error(`Initial selection state: ${locale} ${width} ${mode}`);
    await button.focus();
    await page.keyboard.press('Space');
    if (await button.getAttribute('aria-pressed') !== 'true') throw new Error(`Keyboard selection: ${locale} ${width} ${mode}`);
    await button.click();
    if (await button.getAttribute('aria-pressed') !== 'false') throw new Error(`Mouse deselection: ${locale} ${width} ${mode}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Page overflow: ${locale} ${width} ${mode}`);
    passed.push(`${locale}/${width}/${mode}`);
    if (mode === 'grid') {
      await page.locator('img[alt="test-media"]').click();
      const details = page.getByRole('dialog');
      await details.waitFor();
      await details.locator('button:has(svg.lucide-trash-2)').click();
      await page.waitForTimeout(300);
      if (await page.getByRole('dialog').count() !== 2 || await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Nested media confirmation: ${locale} ${width}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      if (await page.getByRole('dialog').count() !== 1 || await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden')) throw new Error(`Nested confirmation close: ${locale} ${width}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      if (await page.getByRole('dialog').count() !== 0 || await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden')) throw new Error(`Media details close: ${locale} ${width}`);
      passed.push(`${locale}/${width}/nested-confirmation`);
    }
  }
  return { passed: passed.length, results: passed };
}
