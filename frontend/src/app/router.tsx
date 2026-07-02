/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from './store.ts';

import AuthLayout from '../layouts/AuthLayout.tsx';
import AppShell from '../layouts/AppShell.tsx';
import LoginPage from '../features/auth/LoginPage.tsx';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage.tsx';
import PatientsPage from '../features/patients/PatientsPage.tsx';
import PatientProfilePage from '../features/patients/PatientProfilePage.tsx';
import DashboardPage from '../features/dashboard/DashboardPage.tsx';
import AiAssistantPage from '../features/ai/AiAssistantPage.tsx';
import ReportsPage from '../features/reports/ReportsPage.tsx';
import ResearchPage from '../features/research/ResearchPage.tsx';
import {
  SettingsPagePlaceholder
} from './placeholders.tsx';

// 1. Protected Route Guard
function ProtectedRoute() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

// 2. Role-Based Access Guard
interface RoleGuardProps {
  allowedRoles: string[];
}

function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// 4. Router Mapping Setup
export const router = createBrowserRouter([
  // Public Auth Routes
  {
    element: (
      <AuthLayout>
        <Outlet />
      </AuthLayout>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  
  // Guarded System Routes
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/patients', element: <PatientsPage /> },
      { path: '/patients/:id', element: <PatientProfilePage /> },
      { path: '/research', element: <ResearchPage /> },
      { path: '/ai-chat', element: <AiAssistantPage /> },
      
      // Admin + Super Admin only
      {
        element: <RoleGuard allowedRoles={['super_admin', 'admin']} />,
        children: [
          { path: '/reports', element: <ReportsPage /> },
        ],
      },
      
      // Super Admin only
      {
        element: <RoleGuard allowedRoles={['super_admin']} />,
        children: [
          { path: '/settings', element: <SettingsPagePlaceholder /> },
        ],
      },
    ],
  },
  
  // Wildcard fallback redirect
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
