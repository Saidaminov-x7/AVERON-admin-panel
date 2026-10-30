// Run via Playwright MCP against the isolated local Vite server; all credentials and responses are synthetic.
async page => {
  const origin = 'http://127.0.0.1:5178';
  let mode = 'totp';
  let verificationRequests = 0;
  let loginRequests = 0;
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/login')) {
      loginRequests++;
      return route.fulfill({ json: mode === 'totp' ? { requireTotp: true, challengeToken: 'fixture' } : { require2fa: true, tempToken: 'fixture' } });
    }
    if (path.endsWith('/auth/login/verify-totp') || path.endsWith('/auth/verify-2fa')) {
      verificationRequests++;
      return route.fulfill({ status: 400, json: { message: 'Fixture verification error' } });
    }
    return route.fulfill({ status: 401, json: { message: 'isolated fixture' } });
  });
  const results = [];
  for (mode of ['totp', 'telegram']) for (const locale of ['ru', 'uz', 'en']) for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/login`);
    await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
    await page.reload();
    await page.locator('input[type="email"]').fill('test@example.invalid');
    await page.locator('input[type="password"]').fill('fixture-password');
    await page.locator('form button[type="submit"]').click();
    const code = page.locator('form input:visible');
    await code.waitFor();
    await code.fill('123456');
    const before = verificationRequests;
    await page.locator('form button[type="submit"]').click();
    await page.getByRole('alert').waitFor();
    if (verificationRequests !== before + 1 || !await page.getByRole('alert').isVisible()) throw new Error(`Verification error state: ${mode} ${locale} ${width}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Challenge overflow: ${mode} ${locale} ${width}`);
    const beforeBack = loginRequests;
    await page.locator('form button[type="button"]').first().click();
    await page.locator('input[type="email"]').waitFor();
    await page.waitForTimeout(300);
    if (loginRequests !== beforeBack) throw new Error(`Back resubmitted credentials: ${mode} ${locale} ${width}`);
    results.push(`${mode}/${locale}/${width}`);
  }
  return { passed: results.length, results };
}
