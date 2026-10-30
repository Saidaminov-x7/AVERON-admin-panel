// Run via Playwright MCP against the isolated local Vite server.
async page => {
  const origin = 'http://127.0.0.1:5178';
  let mutationCount = 0;
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'fixture' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: { id: 'fixture', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Test' } });
    if (route.request().method() !== 'GET') mutationCount++;
    return route.fulfill({ status: 503, json: { error: 'isolated fixture' } });
  });
  const results = [];
  for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/products/new`);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.reload();
    const group = page.locator('main [role="group"]').first();
    await group.waitFor();
    if (await group.locator('button').count() !== 6) throw new Error(`Step count: ${locale} ${width}`);
    for (let index = 0; index < 6; index++) {
      const step = group.locator('button').nth(index);
      await step.click();
      await page.waitForTimeout(200);
      if (await step.getAttribute('aria-current') !== 'step') throw new Error(`Step activation: ${locale} ${width} ${index + 1}`);
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Step overflow: ${locale} ${width} ${index + 1}`);
      results.push(`${locale}/${width}/step-${index + 1}`);
    }
    const before = mutationCount;
    await page.locator('button[type="submit"][form]').click();
    await page.waitForTimeout(300);
    if (await group.locator('button').first().getAttribute('aria-current') !== 'step') throw new Error(`Validation did not return to first step: ${locale} ${width}`);
    if (await page.locator('[role="alert"]:visible').count() === 0 || await page.evaluate(() => document.activeElement?.getAttribute('role') !== 'alert')) throw new Error(`Validation summary not focused: ${locale} ${width}`);
    if (mutationCount !== before) throw new Error(`Empty form sent a mutation: ${locale} ${width}`);
    results.push(`${locale}/${width}/empty-validation`);
  }
  return { passed: results.length, results };
}
