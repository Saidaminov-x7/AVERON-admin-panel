import { test as base, expect, type Page } from '@playwright/test';

export const FIXTURE_USER = {
  id: 'e2e-admin',
  email: 'admin.e2e@example.invalid',
  name: 'E2E Administrator',
  role: 'ADMIN',
  adminRole: 'SUPER_ADMIN',
};

type FixtureOptions = { locale: 'ru' | 'uz' | 'en' };
type FixtureData = { blockedRequests: string[]; blockedWrites: string[] };

export const test = base.extend<FixtureOptions & FixtureData>({
  locale: ['ru', { option: true }],
  blockedRequests: async ({}, use) => use([]),
  blockedWrites: async ({}, use) => use([]),
  page: async ({ page, locale, blockedRequests, blockedWrites }, use) => {
    await page.addInitScript((language) => {
      localStorage.setItem('i18nextLng', language);
      localStorage.setItem('averon-admin-theme', 'dark');
      localStorage.removeItem('admin_remembered_email');
      localStorage.removeItem('averon-admin-sidebar-collapsed');
      localStorage.removeItem('averon-admin-sidebar-width');
    }, locale);

    await page.route('**/*', async (route) => {
      const requestUrl = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(requestUrl.hostname)) {
        blockedRequests.push(`${route.request().method()} ${requestUrl.origin}${requestUrl.pathname}`);
        await route.abort('blockedbyclient');
        return;
      }

      if (!requestUrl.pathname.startsWith('/api/backend/')) {
        await route.continue();
        return;
      }

      const method = route.request().method();
      const apiPath = requestUrl.pathname.replace(/^\/api\/backend/, '');
      const fixture = (body: unknown, status = 200) => route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

      if (apiPath === '/auth/refresh' && method === 'POST') {
        await fixture({ accessToken: 'e2e-access-token' });
      } else if (apiPath === '/auth/me' && method === 'GET') {
        await fixture(FIXTURE_USER);
      } else if (apiPath === '/auth/login' && method === 'POST') {
        const body = route.request().postDataJSON() as { email?: string };
        if (body.email === 'invalid@example.invalid') {
          await fixture({ message: 'Invalid fixture credentials' }, 401);
        } else {
          await fixture({ require2fa: true, tempToken: 'e2e-two-factor-challenge', message: 'Fixture code sent' });
        }
      } else if (apiPath === '/auth/verify-2fa' && method === 'POST') {
        await fixture({ accessToken: 'e2e-verified-access-token', user: FIXTURE_USER });
      } else if (apiPath === '/auth/login/verify-totp' && method === 'POST') {
        await fixture({ accessToken: 'e2e-totp-access-token', user: FIXTURE_USER });
      } else if (apiPath === '/auth/resend-2fa' && method === 'POST') {
        await fixture({ ok: true, message: 'Fixture code resent' });
      } else if (method !== 'GET' && method !== 'HEAD') {
        blockedWrites.push(`${method} ${apiPath}`);
        await fixture({ message: 'Blocked by local E2E fixture policy' }, 403);
      } else {
        // Unknown reads are explicit fixture failures, never fabricated business data.
        await fixture({ message: 'No local E2E fixture for this read', fixture: true }, 503);
      }
    });

    await use(page);
    expect(blockedRequests, 'Browser attempted a non-loopback request').toEqual([]);
    expect(blockedWrites, 'A non-auth business write was blocked by the E2E fixture').toEqual([]);
  },
});

export async function openAuthenticated(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.locator('.averon-admin-shell')).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, `document overflows horizontally: ${JSON.stringify(dimensions)}`)
    .toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

