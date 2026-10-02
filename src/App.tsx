import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useInitAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import ProtectedRoute from './components/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const CommerceDashboardPage = lazy(() => import('./pages/commerce/CommerceDashboardPage'));
const ProductsPage = lazy(() => import('./pages/commerce/ProductsPage'));
const CategoriesPage = lazy(() => import('./pages/commerce/CategoriesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ImportsPage = lazy(() => import('./pages/commerce/ImportsPage'));
const OrdersPage = lazy(() => import('./pages/commerce/OrdersPage'));
const ReviewsPage = lazy(() => import('./pages/commerce/ReviewsPage'));
const FinancePage = lazy(() => import('./pages/commerce/FinancePage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const StaffPage = lazy(() => import('./pages/settings/StaffPage'));
const GeneralSettingsPage = lazy(() => import('./pages/settings/GeneralSettingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const SystemHealthPage = lazy(() => import('./pages/system/SystemHealthPage'));
const MediaLibraryPage = lazy(() => import('./pages/MediaLibraryPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ErrorLogsPage = lazy(() => import('./pages/ErrorLogsPage'));
const VisualSearchAuditPage = lazy(() => import('./pages/VisualSearchAuditPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const Guard = ({ children, role }: { children: ReactNode; role?: 'SUPER_ADMIN' }) => <ProtectedRoute requiredAdminRole={role}>{children}</ProtectedRoute>;

export default function App() {
  useTheme(); useInitAuth();
  return <BrowserRouter><Suspense fallback={<div className="p-6" role="status" aria-label="Loading page" />}><Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/" element={<Guard><CommerceDashboardPage/></Guard>}/>
    <Route path="/products" element={<Guard><ProductsPage/></Guard>}/>
    <Route path="/categories" element={<Guard><CategoriesPage/></Guard>}/>
    <Route path="/imports" element={<Guard><ImportsPage/></Guard>}/>
    <Route path="/orders" element={<Guard><OrdersPage/></Guard>}/>
    <Route path="/reviews" element={<Guard><ReviewsPage/></Guard>}/>
    <Route path="/finance" element={<Guard><FinancePage/></Guard>}/>
    <Route path="/media" element={<Guard><MediaLibraryPage/></Guard>}/>
    <Route path="/users" element={<Guard><UsersPage/></Guard>}/>
    <Route path="/users/:id" element={<Guard><UserProfilePage/></Guard>}/>
    <Route path="/audit-log" element={<Guard><AuditLogPage/></Guard>}/>
    <Route path="/visual-search/audit" element={<Guard><VisualSearchAuditPage/></Guard>}/>
    <Route path="/notifications" element={<Guard><NotificationsPage/></Guard>}/>
    <Route path="/analytics" element={<Guard><AnalyticsPage/></Guard>}/>
    <Route path="/error-logs" element={<Guard><ErrorLogsPage/></Guard>}/>

    <Route path="/profile" element={<Guard><ProfilePage/></Guard>}/>
    <Route path="/settings" element={<Navigate to="/settings/general" replace/>}/>
    <Route path="/settings/general" element={<Guard><GeneralSettingsPage/></Guard>}/>
    <Route path="/settings/staff" element={<Guard role="SUPER_ADMIN"><StaffPage/></Guard>}/>
    <Route path="/system/health" element={<Guard><SystemHealthPage/></Guard>}/>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes></Suspense></BrowserRouter>;
}
