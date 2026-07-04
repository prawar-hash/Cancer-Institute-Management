import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Menu, X, LogOut, User, LayoutDashboard, Users, FileText,
  BrainCircuit, BarChart3, Settings, Bell
} from 'lucide-react';
import { RootState } from '../app/store.ts';
import { clearCredentials } from '../features/auth/authSlice.ts';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(clearCredentials());
    navigate('/login');
  };

  // Define navigation items based on roles
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'student'] },
    { name: 'Patients', path: '/patients', icon: Users, roles: ['super_admin', 'admin', 'student'] },
    { name: 'Research Portal', path: '/research', icon: BarChart3, roles: ['super_admin', 'admin', 'student'] },
    { name: 'AI Assistant', path: '/ai-chat', icon: BrainCircuit, roles: ['super_admin', 'admin', 'student'] },
    { name: 'Medical Reports', path: '/reports', icon: FileText, roles: ['super_admin', 'admin'] },
    { name: 'System Settings', path: '/settings', icon: Settings, roles: ['super_admin'] },
  ];

  const filteredNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="flex min-h-screen bg-[#F7F8FA] font-sans">
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-64 border-r border-gray-200 bg-white md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/ICSR%20LOGO.png"
              alt="ICSR Logo"
              className="h-10 w-10 object-contain rounded-lg"
            />
            <span className="font-heading font-bold text-[#0E1116] tracking-tight">
              Onco Sphere
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-4">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${isActive
                  ? 'bg-[#0B63CE]/5 text-[#0B63CE]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B63CE]/10 text-[#0B63CE]">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#0E1116]">
                {user?.email}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {user?.role.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Shell */}
      <div className="ml-64 flex flex-1 flex-col">
        {/* Sticky Mobile Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 md:hidden"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <Link to="/" className="flex items-center gap-2 md:hidden">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B63CE] text-white font-heading font-black">
                <img
                  src="/ICSR%20LOGO.png"
                  alt="ICSR Logo"
                  className="h-10 w-10 object-contain rounded-lg"
                />
              </span>
            </Link>
            <h2 className="hidden font-heading text-lg font-bold tracking-tight text-[#0E1116] md:block">
              Cancer Institute AI Management And Research Platform
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-500">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative flex w-64 max-w-xs flex-col border-r border-gray-200 bg-white py-4 shadow-xl">
              <div className="flex h-12 items-center justify-between px-6 border-b border-gray-200">
                <span className="font-heading font-bold text-[#0E1116]">Menu Navigation</span>
                <button onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 space-y-1 px-4 py-4">
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workspace Content Router Viewport */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
