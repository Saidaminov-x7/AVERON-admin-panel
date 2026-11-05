// Run via Playwright MCP against the isolated local Vite server.
async page => {
  const origin = 'http://127.0.0.1:5178';
  const patches = [];
  await page.unrouteAll({ behavior: 'wait' });
  await page.route('**/api/backend/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/auth/refresh')) {
      return route.fulfill({ json: { accessToken: 'fixture-access-token' } });
    }
    if (path.endsWith('/auth/me')) {
      return route.fulfill({
        json: { id: 'fixture-admin', role: 'ADMIN', adminRole: 'SUPER_ADMIN', name: 'Local Fixture' },
      });
    }
    if (path.endsWith('/admin/site-settings') && request.method() === 'GET') {
      return route.fulfill({
        json: {
          siteName: 'AVERON',
          contactEmail: 'qa@example.invalid',
          contactPhone: '+998 90 123 45 67',
          maintenanceMode: true,
          maintenanceMessage: '',
          maintenancePasswordEnabled: true,
          mobilePinchZoomEnabled: true,
          maxProductPhotos: 15,
          maxProductPhotoSizeMb: 10,
          navLinks: [],
          logoUrl: null,
          updatedAt: new Date().toISOString(),
          updatedBy: null,
        },
      });
    }
    if (path.endsWith('/admin/site-settings') && request.method() === 'PATCH') {
      patches.push(request.postDataJSON());
      return route.fulfill({
        json: {
          siteName: 'AVERON',
          contactEmail: 'qa@example.invalid',
          contactPhone: '+998 90 123 45 67',
          maintenanceMode: true,
          maintenanceMessage: '',
          maintenancePasswordEnabled: true,
          mobilePinchZoomEnabled: true,
          maxProductPhotos: 15,
          maxProductPhotoSizeMb: 10,
          navLinks: [],
          logoUrl: null,
          updatedAt: new Date().toISOString(),
          updatedBy: null,
        },
      });
    }
    return route.fulfill({ status: 503, json: { message: 'isolated fixture only' } });
  });

  const expectedHints = {
    ru: 'Оставьте поле пустым, чтобы сохранить текущий пароль.',
    uz: 'Joriy parolni saqlash uchun maydonni bo‘sh qoldiring.',
    en: 'Leave blank to keep the current password.',
  };
  const results = [];
  for (const locale of ['ru', 'uz', 'en']) {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/settings/general`);
      await page.evaluate(value => localStorage.setItem('i18nextLng', value), locale);
      await page.reload();

      const password = page.locator('input[type="password"]');
      await password.waitFor();
      if (await password.inputValue() !== '') throw new Error('Stored secret was hydrated into the form');
      if (!(await page.getByText(expectedHints[locale], { exact: false }).count())) {
        throw new Error(`Missing localized password hint: ${locale}`);
      }
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
        throw new Error(`Horizontal overflow: ${locale}/${width}`);
      }

      let responsePromise = page.waitForResponse(response =>
        response.request().method() === 'PATCH'
        && new URL(response.url()).pathname.endsWith('/admin/site-settings'));
      await page.locator('button[type="submit"]').click();
      await responsePromise;
      if (Object.hasOwn(patches.at(-1), 'maintenanceBypassPassword')) {
        throw new Error('Blank password was included in update payload');
      }

      await password.fill('  test-maintenance-password-01  ');
      responsePromise = page.waitForResponse(response =>
        response.request().method() === 'PATCH'
        && new URL(response.url()).pathname.endsWith('/admin/site-settings'));
      await page.locator('button[type="submit"]').click();
      await responsePromise;
      if (patches.at(-1).maintenanceBypassPassword !== 'test-maintenance-password-01') {
        throw new Error('New password was not trimmed and sent for replacement');
      }
      results.push(`${locale}/${width}`);
    }
  }
  return { passed: results.length, cases: results, patchCount: patches.length, isolatedFixtureOnly: true };
}
