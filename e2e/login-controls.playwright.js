// Run via Playwright MCP against the isolated local Vite server.
async page => {
  const origin = 'http://127.0.0.1:5178';
  let loginRequests = 0;
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/login')) loginRequests++;
    return route.fulfill({ status: 401, json: { message: 'isolated fixture' } });
  });
  const results = [];
  for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/login`);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.reload();
    const email = page.locator('input[type="email"]');
    const password = page.locator('input[type="password"]');
    await password.waitFor();
    const visibility = page.locator('button[aria-pressed]');
    await visibility.focus();
    await page.keyboard.press('Enter');
    if (await page.locator('input[type="text"]').count() !== 1 || await visibility.getAttribute('aria-pressed') !== 'true') throw new Error(`Show password: ${locale} ${width}`);
    await page.keyboard.press('Space');
    if (await page.locator('input[type="password"]').count() !== 1 || await visibility.getAttribute('aria-pressed') !== 'false') throw new Error(`Hide password: ${locale} ${width}`);
    const remember = page.locator('input[type="checkbox"]');
    await remember.check();
    if (!await remember.isChecked()) throw new Error(`Remember-me check: ${locale} ${width}`);
    await remember.uncheck();
    const before = loginRequests;
    await page.locator('form button[type="submit"]').click();
    if (loginRequests !== before || await email.evaluate(element => element.validity.valid)) throw new Error(`Required email validation: ${locale} ${width}`);
    await email.fill('invalid-email');
    await page.locator('form button[type="submit"]').click();
    if (loginRequests !== before || await email.evaluate(element => element.validity.valid)) throw new Error(`Malformed email validation: ${locale} ${width}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Login overflow: ${locale} ${width}`);
    results.push(`${locale}/${width}`);
  }
  return { passed: results.length, results };
}
