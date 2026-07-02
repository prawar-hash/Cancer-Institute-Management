// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice.ts';

afterEach(() => {
  cleanup();
});

// Simple mockup components representing protected routes
function MockPatientsPage() {
  return <div>Patients Registry Page</div>;
}

function MockReportsPage() {
  return <div>Admin Reports Page</div>;
}

function MockLoginPage() {
  return <div>Auth Login Page</div>;
}

// Custom Guard components replicating router.tsx guard behaviors
interface RoleGuardProps {
  allowedRoles: string[];
  userRole?: string;
  children: React.ReactNode;
}

function MockRoleGuard({ allowedRoles, userRole, children }: RoleGuardProps) {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <div data-testid="denied-node">Access Denied (Role Guard)</div>;
  }
  return <>{children}</>;
}

interface ProtectedRouteProps {
  isAuthenticated: boolean;
  children: React.ReactNode;
}

function MockProtectedRoute({ isAuthenticated, children }: ProtectedRouteProps) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

describe('Frontend Routing and Role Guards', () => {
  test('redirects unauthenticated operators to /login', () => {
    // Replicating a guest user session
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          user: null,
          isAuthenticated: false,
          token: null,
        },
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/patients']}>
          <Routes>
            <Route
              path="/patients"
              element={
                <MockProtectedRoute isAuthenticated={store.getState().auth.isAuthenticated}>
                  <MockPatientsPage />
                </MockProtectedRoute>
              }
            />
            <Route path="/login" element={<MockLoginPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // Assert redirection occurred
    expect(screen.getByText('Auth Login Page')).toBeDefined();
    expect(screen.queryByText('Patients Registry Page')).toBeNull();
  });

  test('blocks student users from entering admin reports view', () => {
    // Active student user session
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          user: { id: 1, email: 'student@institute.org', role: 'student', status: 'active' },
          isAuthenticated: true,
          token: 'mock-jwt-token',
        },
      },
    });

    const userRole = store.getState().auth.user?.role;

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/reports']}>
          <Routes>
            <Route
              path="/reports"
              element={
                <MockProtectedRoute isAuthenticated={store.getState().auth.isAuthenticated}>
                  <MockRoleGuard allowedRoles={['super_admin', 'admin']} userRole={userRole}>
                    <MockReportsPage />
                  </MockRoleGuard>
                </MockProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // Assert that student role matches deny conditions
    expect(screen.getByTestId('denied-node')).toBeDefined();
    expect(screen.queryByText('Admin Reports Page')).toBeNull();
  });

  test('authorizes admin roles to enter reports view', () => {
    // Active administrator session
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          user: { id: 2, email: 'admin@institute.org', role: 'admin', status: 'active' },
          isAuthenticated: true,
          token: 'mock-jwt-token',
        },
      },
    });

    const userRole = store.getState().auth.user?.role;

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/reports']}>
          <Routes>
            <Route
              path="/reports"
              element={
                <MockProtectedRoute isAuthenticated={store.getState().auth.isAuthenticated}>
                  <MockRoleGuard allowedRoles={['super_admin', 'admin']} userRole={userRole}>
                    <MockReportsPage />
                  </MockRoleGuard>
                </MockProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    // Assert access is successfully granted
    expect(screen.getByText('Admin Reports Page')).toBeDefined();
    expect(screen.queryByTestId('denied-node')).toBeNull();
  });
});
