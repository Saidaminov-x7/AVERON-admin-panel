// Run via Playwright MCP against isolated local Vite; every order and API response is synthetic.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const order = { orderNumber: 'TEST-001', status: 'CREATED', currency: 'UZS', subtotal: 100, discount: 0, deliveryCost: 0, totalRevenue: 100, contact: { name: 'Test' }, deliveryAddress: { city: 'Test', address: 'Test' }, items: [{ id: 'item', title: 'Test product', quantity: 1, unitPrice: 100, totalPrice: 100 }], statusHistory: [], shipments: [], delivery: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
  const mutations = [];
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    if (request.method() === 'GET' && path.endsWith('/api/v1/admin/orders')) return route.fulfill({ json: [order] });
    if (request.method() === 'GET' && path.endsWith('/api/v1/admin/orders/TEST-001')) return route.fulfill({ json: order });
    if (request.method() !== 'GET') mutations.push({ method: request.method(), path, body: request.postDataJSON() });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });
  const results = [];
  for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/orders`);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.reload();
    await page.getByText('#TEST-001').waitFor();
    await page.locator('tbody tr button').click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const buttons = dialog.locator('section').last().locator('button');
    const layout = await buttons.evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, y: rect.y, width: rect.width, scroll: element.scrollWidth, client: element.clientWidth };
    }));
    if (layout.length !== 2 || layout.some(rect => rect.left < -1 || rect.right > width + 1 || rect.scroll > rect.client + 1)) throw new Error(`Order actions: ${locale} ${width} ${JSON.stringify(layout)}`);
    await buttons.first().click();
    await page.waitForTimeout(300);
    if (await page.getByRole('dialog').count() !== 2) throw new Error(`Cancel confirmation: ${locale} ${width}`);
    const confirmation = page.getByRole('dialog').last();
    const confirm = confirmation.locator('button').last();
    const beforeCancel = mutations.length;
    await confirm.click();
    await page.waitForTimeout(350);
    const cancelRequests = mutations.slice(beforeCancel);
    if (cancelRequests.length !== 1 || cancelRequests[0].body.status !== 'CANCELLED') throw new Error(`Cancel request: ${locale} ${width}`);
    if (!await confirm.evaluate(button => document.activeElement === button)) throw new Error(`Confirmation focus after failure: ${locale} ${width}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (await page.getByRole('dialog').count() !== 1 || await page.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden')) throw new Error(`Nested confirmation close: ${locale} ${width}`);
    const select = dialog.locator('button[aria-haspopup="listbox"]');
    await select.click();
    await page.getByRole('option').nth(1).click();
    await dialog.locator('input[name="provider"]').fill('Fixture carrier');
    await dialog.locator('input[name="trackingNumber"]').fill('FIXTURE-123');
    const before = mutations.length;
    await dialog.locator('form button[type="submit"]').click();
    await page.waitForTimeout(350);
    const sent = mutations.slice(before);
    if (sent.length !== 1 || sent[0].method !== 'PATCH' || !sent[0].path.endsWith('/orders/TEST-001/shipping') || sent[0].body.status !== 'PREPARING' || sent[0].body.provider !== 'Fixture carrier' || sent[0].body.trackingNumber !== 'FIXTURE-123') throw new Error(`Shipping request: ${locale} ${width} ${JSON.stringify(sent)}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Order modal overflow: ${locale} ${width}`);
    if (!await dialog.locator('form button[type="submit"]').evaluate(button => document.activeElement === button)) throw new Error(`Shipping focus after failure: ${locale} ${width}`);
    const beforeStatus = mutations.length;
    await buttons.last().click();
    await page.waitForTimeout(350);
    const statusRequests = mutations.slice(beforeStatus);
    if (statusRequests.length !== 1 || statusRequests[0].method !== 'PATCH' || !statusRequests[0].path.endsWith('/orders/TEST-001/status') || statusRequests[0].body.status !== 'CONFIRMED') throw new Error(`Status request: ${locale} ${width}`);
    if (!await buttons.last().evaluate(button => document.activeElement === button)) throw new Error(`Status focus after failure: ${locale} ${width}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (await page.getByRole('dialog').count() !== 0 || await page.evaluate(() => getComputedStyle(document.body).overflow === 'hidden')) throw new Error(`Order modal close: ${locale} ${width}`);
    results.push(`${locale}/${width}`);
  }
  return { passed: results.length, results };
}
