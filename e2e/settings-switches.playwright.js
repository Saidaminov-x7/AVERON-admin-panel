// Run via Playwright MCP against the isolated local Vite server.
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
  for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/settings/general`);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.reload();
    const switches = page.locator('main [role="switch"]');
    await switches.first().waitFor();
    const state = () => switches.evaluateAll(elements => elements.map(element => element.getAttribute('aria-checked')));
    if (JSON.stringify(await state()) !== JSON.stringify(['true', 'false'])) throw new Error(`Initial settings: ${locale} ${width}`);
    await switches.nth(0).click();
    await switches.nth(1).focus();
    await page.keyboard.press('Space');
    if (JSON.stringify(await state()) !== JSON.stringify(['false', 'true', 'false'])) throw new Error(`Maintenance switch: ${locale} ${width}`);
    await switches.nth(2).click();
    if (JSON.stringify(await state()) !== JSON.stringify(['false', 'true', 'true'])) throw new Error(`Password switch: ${locale} ${width}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Settings overflow: ${locale} ${width}`);
    await switches.nth(1).click();
    await switches.nth(0).click();
    if (JSON.stringify(await state()) !== JSON.stringify(['true', 'false'])) throw new Error(`Reset settings: ${locale} ${width}`);
    results.push(`${locale}/${width}`);
  }
  return { passed: results.length, results };
}
