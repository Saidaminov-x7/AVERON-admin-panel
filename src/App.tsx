import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useInitAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import ProtectedRoute from './components/ProtectedRoute';
import AdminThemeInjector from './components/AdminThemeInjector';
import LoginPage from './pages/LoginPage';
import CommerceDashboardPage from './pages/commerce/CommerceDashboardPage';
import ProductsPage from './pages/commerce/ProductsPage';
import ImportsPage from './pages/commerce/ImportsPage';
import OrdersPage from './pages/commerce/OrdersPage';
import FinancePage from './pages/commerce/FinancePage';
import UsersPage from './pages/UsersPage';
import UserProfilePage from './pages/UserProfilePage';
import StaffPage from './pages/settings/StaffPage';
import GeneralSettingsPage from './pages/settings/GeneralSettingsPage';
import ProfilePage from './pages/ProfilePage';
import AuditLogPage from './pages/AuditLogPage';
import SystemHealthPage from './pages/system/SystemHealthPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import NotFoundPage from './pages/NotFoundPage';

const Guard = ({ children, role }: { children: ReactNode; role?: 'SUPER_ADMIN' }) => <ProtectedRoute requiredAdminRole={role}>{children}</ProtectedRoute>;

export default function App() {
  useTheme(); useInitAuth();
  return <BrowserRouter><AdminThemeInjector/><Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/" element={<Guard><CommerceDashboardPage/></Guard>}/>
    <Route path="/products" element={<Guard><ProductsPage/></Guard>}/>
    <Route path="/imports" element={<Guard><ImportsPage/></Guard>}/>
    <Route path="/orders" element={<Guard><OrdersPage/></Guard>}/>
    <Route path="/finance" element={<Guard><FinancePage/></Guard>}/>
    <Route path="/media" element={<Guard><MediaLibraryPage/></Guard>}/>
    <Route path="/users" element={<Guard><UsersPage/></Guard>}/>
    <Route path="/users/:id" element={<Guard><UserProfilePage/></Guard>}/>
    <Route path="/audit-log" element={<Guard><AuditLogPage/></Guard>}/>
    <Route path="/profile" element={<Guard><ProfilePage/></Guard>}/>
    <Route path="/settings" element={<Navigate to="/settings/general" replace/>}/>
    <Route path="/settings/general" element={<Guard><GeneralSettingsPage/></Guard>}/>
    <Route path="/settings/staff" element={<Guard role="SUPER_ADMIN"><StaffPage/></Guard>}/>
    <Route path="/system/health" element={<Guard><SystemHealthPage/></Guard>}/>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes></BrowserRouter>;
}
