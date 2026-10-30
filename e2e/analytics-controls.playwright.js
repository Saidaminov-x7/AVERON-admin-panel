// Run via Playwright MCP against isolated local Vite; analytics values are synthetic.
async page => {
  const origin = 'http://127.0.0.1:5178';
  let missingRates = false;
  const requests = [];
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    if (path.endsWith('/analytics/admin/range')) {
      requests.push(url.search);
      return route.fulfill({ json: { from: '2026-01-01', to: '2026-01-02', summary: { totalVisitors: 100, totalProducts: 25, totalPaidOrders: 4, revenueUzs: 5000, totalUsers: 20 }, chartData: [{ date: '2026-01-01', visitors: 60, products: 10, registrations: 2 }] } });
    }
    if (path.endsWith('/analytics/funnel')) return route.fulfill({ json: missingRates ? { visits: 100, favorites: 5, paidOrders: 4 } : { visits: 100, favorites: 5, favoriteRate: 0.05, paidOrders: 4, orderRate: 0.04 } });
    if (path.endsWith('/analytics/admin/journey')) return route.fulfill({ json: { firstTimeVisitors: 10, buyers: 2, conversionRate: 0.2, avgDaysToFirstPurchase: 1, avgProductsInFirstOrder: 1, matureVisitors: 4, day3Buyers: 1, day3ConversionRate: 0.25, daily: [] } });
    if (path.endsWith('/analytics/admin/export')) return route.fulfill({ status: 200, contentType: 'text/csv', body: 'date,visitors\n2026-01-01,60\n' });
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });
  const labels = { ru: 'Конверсия:', uz: 'Konversiya:', en: 'Conversion:' };
  const results = [];
  for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    missingRates = false;
    await page.goto(`${origin}/analytics`);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.reload();
    await page.getByText(`${labels[locale]} 5.0%`, { exact: true }).waitFor();
    if ((await page.locator('main').innerText()).includes('%%')) throw new Error(`Duplicate percent: ${locale} ${width}`);
    const buttons = page.locator('main button');
    for (const [index, days] of [[0, '7'], [1, '30'], [2, '90']]) {
      const before = requests.length;
      await buttons.nth(index).click();
      await page.waitForTimeout(250);
      if (!await buttons.nth(index).evaluate(button => button.classList.contains('bg-primary-500'))) throw new Error(`Period selection: ${locale} ${width} ${days}`);
      if (days !== '30' && !requests.slice(before).some(query => new URLSearchParams(query).get('days') === days)) throw new Error(`Period request: ${locale} ${width} ${days}`);
    }
    const beforeCustom = requests.length;
    await buttons.nth(3).click();
    const dates = page.locator('input[type="date"]');
    if (await dates.count() !== 2) throw new Error(`Custom range fields: ${locale} ${width}`);
    await dates.nth(0).fill('2026-01-01');
    await dates.nth(1).fill('2026-01-02');
    await page.waitForTimeout(300);
    if (!requests.slice(beforeCustom).some(query => { const params = new URLSearchParams(query); return params.get('from') === '2026-01-01' && params.get('to') === '2026-01-02'; })) throw new Error(`Custom range request: ${locale} ${width}`);
    const downloadPromise = page.waitForEvent('download');
    await buttons.nth(4).click();
    const download = await downloadPromise;
    if (download.suggestedFilename() !== 'traffic-report-2026-01-01-2026-01-02.csv') throw new Error(`CSV filename: ${locale} ${width}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Analytics overflow: ${locale} ${width}`);
    missingRates = true;
    await page.reload();
    await page.getByText(labels[locale], { exact: false }).first().waitFor();
    const conversion = await page.locator('main').getByText(labels[locale], { exact: false }).allInnerTexts();
    if (conversion.length !== 2 || conversion.some(value => value.includes('%'))) throw new Error(`Missing rate label: ${locale} ${width} ${conversion}`);
    results.push(`${locale}/${width}`);
  }
  return { passed: results.length, results };
}
