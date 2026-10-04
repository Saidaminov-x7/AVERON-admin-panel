import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useInitAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const CommerceDashboardPage = lazy(() => import('./pages/commerce/CommerceDashboardPage'));
const ProductsPage = lazy(() => import('./pages/commerce/ProductsPage'));
const CategoriesPage = lazy(() => import('./pages/commerce/CategoriesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ImportsPage = lazy(() => import('./pages/commerce/ImportsPage'));
const OrdersPage = lazy(() => import('./pages/commerce/OrdersPage'));
const ReviewsPage = lazy(() => import('./pages/commerce/ReviewsPage'));
const FinancePage = lazy(() => import('./pages/commerce/FinancePage'));
const CommercePromosPage = lazy(() => import('./pages/commerce/CommercePromosPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const StaffPage = lazy(() => import('./pages/settings/StaffPage'));
const GeneralSettingsPage = lazy(() => import('./pages/settings/GeneralSettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const SystemHealthPage = lazy(() => import('./pages/system/SystemHealthPage'));
const IntegrationDiagnosticsPage = lazy(() => import('./pages/system/IntegrationDiagnosticsPage'));
const MediaLibraryPage = lazy(() => import('./pages/MediaLibraryPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ErrorLogsPage = lazy(() => import('./pages/ErrorLogsPage'));
const VisualSearchAuditPage = lazy(() => import('./pages/VisualSearchAuditPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const Guard = ({ children, role }: { children: ReactNode; role?: 'SUPER_ADMIN' }) => <ProtectedRoute requiredAdminRole={role}>{children}</ProtectedRoute>;

function PageLoading() {
  return (
    <div className="flex min-h-48 items-center justify-center text-muted" role="status" aria-label="Loading page">
      <span className="size-8 animate-spin rounded-full border-2 border-app border-t-primary-500" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  useTheme(); useInitAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Suspense fallback={<PageLoading />}><LoginPage /></Suspense>} />
        <Route element={<Guard><Layout persistent><Suspense fallback={<PageLoading />}><Outlet /></Suspense></Layout></Guard>}>
          <Route path="/" element={<CommerceDashboardPage />} />
          <Route path="/products/new" element={<ProductsPage />} />
          <Route path="/products/edit/:identifier" element={<ProductsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/imports" element={<ImportsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/commerce/promo-codes" element={<CommercePromosPage />} />
          <Route path="/media" element={<MediaLibraryPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserProfilePage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/visual-search/audit" element={<VisualSearchAuditPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/error-logs" element={<ErrorLogsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
          <Route path="/settings/general" element={<GeneralSettingsPage />} />
          <Route path="/settings/staff" element={<Guard role="SUPER_ADMIN"><StaffPage /></Guard>} />
          <Route path="/system/health" element={<SystemHealthPage />} />
          <Route path="/system/integrations" element={<IntegrationDiagnosticsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
