// Run with Playwright MCP browser_run_code_unsafe against the isolated local Vite server.
// Every API call is intercepted; no live data is read or modified.
async (page) => {
  const origin = 'http://127.0.0.1:5178';
  const pagination = { page: 1, pages: 1, total: 1, limit: 15 };
  const order = { orderNumber: 'TEST-001', status: 'PENDING', currency: 'UZS', subtotal: 100, discount: 0, deliveryCost: 0, totalRevenue: 100, contact: { name: 'Test' }, deliveryAddress: { city: 'Test', address: 'Test' }, items: [{ id: 'item', title: 'Test product', quantity: 1, unitPrice: 100, totalPrice: 100 }], statusHistory: [], shipments: [], delivery: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
  const fixtures = {
    '/api/v1/admin/categories': [{ id: 'fixture-category', slug: 'example', name: { ru: 'Тестовая категория', uz: 'Sinov', en: 'Test category' }, active: true, _count: { products: 2 } }],
    '/api/v1/admin/products': { items: [{ id: 'fixture-product', slug: 'fixture-product', status: 'DRAFT', source: 'MANUAL', salePriceUzs: 100, translations: [], images: [], variants: [] }], pagination },
    '/api/v1/admin/imports': { items: [{ id: 'fixture-import', originalTitle: 'Тестовый импорт', source: 'MANUAL', sourceUrl: 'https://example.invalid', status: 'PENDING_REVIEW', createdAt: '2026-01-01T00:00:00Z', normalizedPayload: {} }], pagination },
    '/api/v1/admin/reviews': { items: [{ id: 'fixture-review', product: { slug: 'sample', translations: [] }, orderNumber: 'test', status: 'PENDING', rating: 4, title: 'Test', comment: 'Test', customer: { name: 'Test' }, verifiedPurchase: false, fitFeedback: null, media: [], createdAt: '2026-01-01T00:00:00Z', moderatedAt: null }], pagination },
    '/api/v1/admin/orders': [order],
    '/api/v1/admin/orders/TEST-001': order,
  };
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/backend', '');
    if (path === '/auth/refresh') return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path === '/auth/me') return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    if (request.method() === 'GET' && path in fixtures) return route.fulfill({ json: fixtures[path] });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });
  const results = [];
  for (const locale of ['ru', 'uz', 'en']) {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['categories', 'products', 'imports', 'reviews']) {
        await page.goto(`${origin}/${path}`);
        await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
        await page.reload();
        const article = page.locator('article').first();
        await article.waitFor();
        const state = await article.evaluate(card => {
          const bounds = card.getBoundingClientRect();
          const buttons = [...card.querySelectorAll('button')].map(button => {
            const rect = button.getBoundingClientRect();
            const clipped = [button, ...button.querySelectorAll('*')].some(element => element.scrollWidth > element.clientWidth + 1);
            return { x: rect.x, y: rect.y, right: rect.right, clipped };
          });
          return { left: bounds.left, right: bounds.right, buttons, overflow: document.documentElement.scrollWidth > innerWidth };
        });
        if (state.buttons.length < 2 || state.overflow || state.buttons.some(button => button.clipped || button.x < state.left - 1 || button.right > state.right + 1)) {
          throw new Error(`Card controls failed: ${locale} ${width} ${path} ${JSON.stringify(state)}`);
        }
        results.push(`${locale}/${width}/${path}`);
        const modalButtons = path === 'categories' ? [1] : path === 'imports' ? [0, 1, 2] : [];
        for (const buttonIndex of modalButtons) {
          await article.locator('button').nth(buttonIndex).click();
          await page.getByRole('dialog').waitFor();
          await page.waitForTimeout(350);
          const modalState = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
          if (modalState.document > modalState.viewport) throw new Error(`Modal overflows: ${locale} ${width} ${path} ${buttonIndex} ${JSON.stringify(modalState)}`);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
          if (await page.getByRole('dialog').count() || await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden')) {
            throw new Error(`Modal failed to close: ${locale} ${width} ${path} ${buttonIndex}`);
          }
          results.push(`${locale}/${width}/${path}/modal-${buttonIndex}`);
        }
      }
      await page.goto(`${origin}/orders`);
      await page.getByText('#TEST-001').waitFor();
      await page.locator('tbody tr').first().locator('button').click();
      await page.getByRole('dialog').waitFor();
      await page.waitForTimeout(400);
      const orderState = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      if (orderState.document > orderState.viewport) throw new Error(`Order modal overflows: ${locale} ${width} ${JSON.stringify(orderState)}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      if (await page.getByRole('dialog').count() || await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden')) {
        throw new Error(`Order modal failed to close: ${locale} ${width}`);
      }
      results.push(`${locale}/${width}/order-modal`);
    }
  }
  return { passed: results.length, results };
}
