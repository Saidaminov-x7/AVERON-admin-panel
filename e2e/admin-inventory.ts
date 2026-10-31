/** Every route registered in src/App.tsx, including redirects and the wildcard. */
export const ADMIN_ROUTE_INVENTORY = [
  { path: '/login', kind: 'public' },
  { path: '/', kind: 'protected' },
  { path: '/products/new', kind: 'protected' },
  { path: '/products/edit/e2e-fixture', kind: 'protected' },
  { path: '/products', kind: 'protected' },
  { path: '/categories', kind: 'protected' },
  { path: '/imports', kind: 'protected' },
  { path: '/orders', kind: 'protected' },
  { path: '/reviews', kind: 'protected' },
  { path: '/finance', kind: 'protected' },
  { path: '/commerce/promo-codes', kind: 'protected' },
  { path: '/media', kind: 'protected' },
  { path: '/users', kind: 'protected' },
  { path: '/users/e2e-fixture', kind: 'protected' },
  { path: '/audit-log', kind: 'protected' },
  { path: '/visual-search/audit', kind: 'protected' },
  { path: '/notifications', kind: 'protected' },
  { path: '/analytics', kind: 'protected' },
  { path: '/error-logs', kind: 'protected' },
  { path: '/profile', kind: 'protected' },
  { path: '/settings', kind: 'redirect' },
  { path: '/settings/general', kind: 'protected' },
  { path: '/settings/staff', kind: 'super-admin' },
  { path: '/system/health', kind: 'protected' },
  { path: '/system/integrations', kind: 'protected' },
  { path: '/e2e-not-registered-route', kind: 'wildcard' },
] as const;

export const ADMIN_LOCALES = ['ru', 'uz', 'en'] as const;
export const RESPONSIVE_WIDTHS = [320, 375, 390, 768, 1024, 1280, 1440] as const;
