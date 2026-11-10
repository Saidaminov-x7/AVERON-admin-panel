import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4173';
const reportDir = 'artifacts/axe';
await mkdir(reportDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
try {
  const context = await browser.newContext();
  await context.route('http://127.0.0.1:8080/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'ci-only-token' } });
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'ci-admin', email: 'ci@example.invalid', name: 'CI Admin', role: 'ADMIN', adminRole: 'ADMIN' } });
    if (url.pathname.endsWith('/categories')) return route.fulfill({ json: [] });
    if (url.pathname.includes('/products')) return route.fulfill({ json: { items: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } } });
    return route.fulfill({ json: {} });
  });
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/refresh')) return route.fulfill({ json: { accessToken: 'ci-only-token' } });
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { id: 'ci-admin', email: 'ci@example.invalid', name: 'CI Admin', role: 'ADMIN', adminRole: 'ADMIN' } });
    if (url.pathname.endsWith('/categories')) return route.fulfill({ json: [] });
    if (url.pathname.includes('/products')) return route.fulfill({ json: { items: [], total: 0, page: 1, limit: 25, totalPages: 0 } });
    return route.fulfill({ json: {} });
  });
  for (const [pageName, path, expected] of [
    ['login', '/login', 'Войти'],
    ['products', '/products', 'Товары'],
    ['product-form', '/products/new', 'Название'],
  ]) {
    const page = await context.newPage();
    let pageError = null;
    page.on('pageerror', error => { pageError = error.message; });
    try {
      const response = await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`HTTP ${response?.status() ?? 'no response'}`);
      await page.getByText(expected, { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
      if (pageError) throw new Error(`uncaught page error: ${pageError}`);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      await writeFile(`${reportDir}/${pageName}.json`, `${JSON.stringify({ page: pageName, url: path, violations: results.violations, passes: results.passes.length, incomplete: results.incomplete.length }, null, 2)}\n`);
      const serious = results.violations.filter(item => item.impact === 'critical' || item.impact === 'serious');
      if (serious.length) failures.push(`${pageName}: ${serious.map(item => `${item.id} (${item.impact})`).join(', ')}`);
    } catch (error) {
      await writeFile(`${reportDir}/${pageName}.json`, `${JSON.stringify({ page: pageName, url: path, error: String(error) }, null, 2)}\n`);
      failures.push(`${pageName}: ${error}`);
    } finally { await page.close(); }
  }
  await context.close();
} finally { await browser.close(); }
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
