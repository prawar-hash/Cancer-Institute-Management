import { useSelector } from 'react-redux';
import { RootState } from '../../app/store.ts';

import SuperAdminDashboard from './SuperAdminDashboard.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import StudentDashboard from './StudentDashboard.tsx';

export default function DashboardPage() {
  const currentUser = useSelector((state: RootState) => state.auth.user);

  switch (currentUser?.role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6 text-center text-[#0B63CE] font-medium text-sm">
          Welcome to the Cancer Institute Management Platform! Your role does not have a designated dashboard.
        </div>
      );
  }
}
