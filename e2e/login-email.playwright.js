// Run through Playwright MCP against isolated local Vite on port 5178.
async page => {
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', route => route.fulfill({ status: 401, json: {} }));
  await page.goto('http://127.0.0.1:5178/login');
  await page.evaluate(() => localStorage.setItem('admin_remembered_email', 'saved@example.invalid'));
  await page.reload();
  const email = page.locator('#login-email');
  await email.waitFor();
  await page.waitForTimeout(500);
  if (await email.inputValue() !== '') throw new Error('Previously saved email was restored');
  if (await page.evaluate(() => localStorage.getItem('admin_remembered_email')) !== null) throw new Error('Previously saved email was not removed');
  await email.fill('typed@example.invalid');
  if (await email.inputValue() !== 'typed@example.invalid') throw new Error('Email entry failed');
  return 'PASS: saved email is not restored; manual entry works';
}
