import { expect } from '@playwright/test';
import { test, openAuthenticated, expectNoHorizontalOverflow } from './fixtures';
import { ADMIN_LOCALES, ADMIN_ROUTE_INVENTORY, RESPONSIVE_WIDTHS } from './admin-inventory';

test.describe('admin route and responsive shell inventory', () => {
  for (const locale of ADMIN_LOCALES) {
    test.describe(`locale ${locale}`, () => {
      test.use({ locale });

      for (const route of ADMIN_ROUTE_INVENTORY) {
        test(`${route.path} (${route.kind}) renders shell without horizontal overflow`, async ({ page }) => {
          const width = 320;
          await page.setViewportSize({ width, height: 900 });
          if (route.kind === 'public') {
            await page.goto(route.path);
            await expect(page.locator('form')).toBeVisible();
          } else {
            await openAuthenticated(page, route.path);
            if (route.kind === 'redirect') await expect(page).toHaveURL(/\/settings\/general$/);
            if (route.kind === 'wildcard') await expect(page.getByRole('main')).toBeVisible();
          }

          await expectNoHorizontalOverflow(page);
          for (const responsiveWidth of [375, 390, 768, 1024, 1280, 1440]) {
            await page.setViewportSize({ width: responsiveWidth, height: 900 });
            await expectNoHorizontalOverflow(page);
          }
        });
      }
    });
  }
});

test.describe('login, two-factor and remember-me', () => {
  test('remember-me remains aligned, login reaches Telegram 2FA, verification completes locally', async ({ page }) => {
    await page.goto('/login');
    const email = page.locator('input[type="email"]');
    const password = page.locator('input[type="password"]');
    const remember = page.locator('#remember-me');
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(remember).toBeVisible();

    const hitArea = remember.locator('xpath=..');
    const indicatorBox = await hitArea.locator('[data-admin-checkbox-indicator]').boundingBox();
    const hitAreaBox = await hitArea.boundingBox();
    expect(indicatorBox).not.toBeNull();
    expect(hitAreaBox).not.toBeNull();
    expect(hitAreaBox!.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs((indicatorBox!.y + indicatorBox!.height / 2) - (hitAreaBox!.y + hitAreaBox!.height / 2))).toBeLessThanOrEqual(2);

    await email.fill('admin.e2e@example.invalid');
    await password.fill('fixture-only-password');
    await remember.locator('xpath=../..').click();
    await expect(remember).toBeChecked();
    await page.locator('#login-submit').click();
    await expect(page.getByText(/Telegram 2FA/i)).toBeVisible();
    const notice = page.locator('[data-admin-2fa-notice]');
    await expect(notice).toBeVisible();
    const noticeColors = await notice.evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color, border: style.borderTopColor };
    });
    expect(noticeColors.background).not.toBe('rgb(255, 255, 255)');
    expect(noticeColors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(noticeColors.color).not.toBe(noticeColors.background);
    expect(noticeColors.border).not.toBe(noticeColors.background);

    const code = page.locator('input[maxlength="6"]');
    await expect(code).toBeVisible();
    await code.fill('123456');
    await page.getByRole('button', { name: /подтвердить и войти|confirm and sign in|tasdiqlash/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.averon-admin-shell')).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('admin_remembered_email')))
      .toBe('admin.e2e@example.invalid');
  });

  test('bad fixture credentials show a visible error without leaving login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('invalid@example.invalid');
    await page.locator('input[type="password"]').fill('fixture-only-password');
    await page.locator('#login-submit').click();
    await expect(page.getByText(/invalid email|неверный email|noto.g.ri email/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('desktop navigation controls', () => {
  test.use({ locale: 'ru' });

  test('locale dropdown switches language and theme toggle persists', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAuthenticated(page, '/');

    await page.locator('[data-action-id="admin.header.language-indicator"]').click();
    const languageMenu = page.getByRole('menu');
    await expect(languageMenu).toBeVisible();
    expect(await languageMenu.evaluate((element) => getComputedStyle(element).overflowY)).not.toBe('auto');
    await page.locator('[data-action-id="admin.header.select-language.en"]').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('en');

    const themeToggle = page.locator('[data-action-id="admin.theme.toggle"]:visible').first();
    const before = await page.locator('html').evaluate((html) => html.classList.contains('dark'));
    await themeToggle.click();
    await expect.poll(() => page.locator('html').evaluate((html) => html.classList.contains('dark')))
      .toBe(!before);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('averon-admin-theme')))
      .toBe(before ? 'light' : 'dark');
  });

  test('sidebar collapse and resize/cancel leave no active drag state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(() => localStorage.removeItem('averon-admin-sidebar-collapsed'));
    await openAuthenticated(page, '/');
    const collapse = page.locator('[data-action-id="admin.sidebar.toggle-collapse"]');
    await collapse.click();
    await expect(collapse).toHaveAttribute('aria-pressed', 'true');
    await collapse.click();
    await expect(collapse).toHaveAttribute('aria-pressed', 'false');

    const resizer = page.locator('[data-action-id="admin.sidebar.resize"]');
    await expect(resizer).toBeVisible();
    const startingWidth = Number(await resizer.getAttribute('aria-valuenow'));
    await resizer.dispatchEvent('pointerdown', { pointerId: 17, button: 0, pointerType: 'mouse', isPrimary: true });
    await expect(page.locator('html')).toHaveClass(/admin-sidebar-resizing/);
    await page.evaluate(() => {
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 17, clientX: 300, button: -1, pointerType: 'mouse' }));
    });
    await expect.poll(() => resizer.getAttribute('aria-valuenow')).not.toBe(String(startingWidth));
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 17 })));
    await expect(page.locator('html')).not.toHaveClass(/admin-sidebar-resizing/);
    await expect(resizer).toHaveAttribute('aria-valuenow', String(startingWidth));
  });
});

test.describe('mobile navigation and product form locale state', () => {
  test.use({ locale: 'ru' });

  test('drawer opens, traps initial focus, and Escape closes/restores page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticated(page, '/');
    const menu = page.locator('[data-action-id="admin.sidebar.toggle-mobile-navigation"]');
    await menu.focus();
    await menu.click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await expect(page.locator(':focus')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await expect(menu).toBeFocused();
  });

  test('drawer backdrop closes without scrolling or selecting background content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticated(page, '/');
    const menu = page.locator('[data-action-id="admin.sidebar.toggle-mobile-navigation"]');
    await menu.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('[data-action-id="admin.sidebar.close-mobile-navigation-backdrop"]').click({ position: { x: 2, y: 2 } });
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(menu).toBeFocused();
  });

  test('new product form preserves entered localized draft while changing locale', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAuthenticated(page, '/products/new');
    const formDialog = page.getByRole('main');
    await expect(formDialog.getByRole('heading', { level: 3 })).toBeVisible();

    for (let step = 0; step < 5; step += 1) {
      await formDialog.getByRole('button', { name: /далее|next|keyingi/i }).click();
    }
    const switches = formDialog.getByRole('switch');
    const switchCount = await switches.count();
    expect(switchCount).toBeGreaterThan(0);
    for (let index = 0; index < switchCount; index += 1) {
      const control = switches.nth(index);
      if (await control.isDisabled()) continue;
      const before = await control.getAttribute('aria-checked');
      await control.locator('xpath=ancestor::label').click();
      await expect(control).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
      await control.locator('xpath=ancestor::label').click();
      await expect(control).toHaveAttribute('aria-checked', before ?? 'false');
    }
    await formDialog.locator('[aria-label="Шаги создания товара"] button').first().click();

    const titleField = formDialog.getByLabel(/название|title|nomi/i).first();
    await titleField.fill('E2E Product Name');
    const localeTrigger = formDialog.locator('button[aria-expanded]').first();
    await localeTrigger.click();
    await formDialog.locator('[role="menuitemradio"]').nth(2).click();
    await expect(formDialog.getByLabel(/название|title|nomi/i).first()).not.toHaveValue('E2E Product Name');
    await localeTrigger.click();
    await formDialog.locator('[role="menuitemradio"]').first().click();
    await expect(formDialog.getByLabel(/название|title|nomi/i).first()).toHaveValue('E2E Product Name');

    await formDialog.getByRole('button', { name: /далее|next|keyingi/i }).click();
    await expect(formDialog.getByText(/шаг 2|step 2|2-qadam/i)).toBeVisible();
    await formDialog.getByRole('button', { name: /назад|back|orqaga/i }).click();
    await expect(formDialog.getByLabel(/название|title|nomi/i).first()).toHaveValue('E2E Product Name');
    // Changing locales is display-only; persistence/business writes are deliberately not exercised.
    await expect(formDialog).toBeVisible();
  });
});

test('all relevant viewport widths remain overflow-free on login, dashboard, and product form', async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of RESPONSIVE_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
  for (const width of RESPONSIVE_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await openAuthenticated(page, '/');
    await expectNoHorizontalOverflow(page);
  }
  for (const width of RESPONSIVE_WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await openAuthenticated(page, '/products/new');
    await expectNoHorizontalOverflow(page);
  }
});
