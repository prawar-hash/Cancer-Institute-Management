/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSystemUsers, useUpdateUserStatus, useSystemAuditLogs, useSystemMetrics } from './dashboardApi.ts';
import { toast } from 'react-hot-toast';
import { ShieldCheck, Database, KeyRound, HardDrive, Terminal } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import Card from '../../components/ui/Card.tsx';
import StatCard from '../../components/ui/StatCard.tsx';
import Button from '../../components/ui/Button.tsx';

interface UserRecord {
  id: number;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

interface AuditRecord {
  id: number;
  user_id: number;
  action: string;
  target_table: string;
  target_id: number | null;
  details: Record<string, any> | null;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const { data: users, isLoading: isUsersLoading } = useSystemUsers();
  const { data: logs } = useSystemAuditLogs();
  const { data: metrics } = useSystemMetrics();
  const updateStatusMutation = useUpdateUserStatus();

  const handleToggleStatus = async (user: UserRecord) => {
    const targetStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      await updateStatusMutation.mutateAsync({ userId: user.id, status: targetStatus });
      toast.success(`User status updated to ${targetStatus}!`);
    } catch {
      toast.error('Failed to update user status.');
    }
  };

  // Compile data for Recharts bar chart showing action frequencies
  const compileChartData = () => {
    if (!logs) return [];
    const counts: Record<string, number> = {};
    logs.forEach((log: AuditRecord) => {
      counts[log.action] = (counts[log.action] || 0) + 1;
    });
    return Object.keys(counts).map((action) => ({
      name: action.replace('CREATE_', '').replace('UPDATE_', ''),
      Count: counts[action],
    }));
  };

  const chartData = compileChartData();

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard
          title="Database Status"
          value={metrics?.db_connection === 'healthy' ? 'ONLINE' : 'OFFLINE'}
          icon={<Database className="h-5 w-5 text-emerald-600" />}
          description="MySQL 8 Node 0"
        />
        <StatCard
          title="Storage Size"
          value={`${metrics?.db_size_kb || 0} KB`}
          icon={<HardDrive className="h-5 w-5 text-blue-600" />}
          description="GCS object volumes"
        />
        <StatCard
          title="Active Users"
          value={metrics?.active_users || 0}
          icon={<KeyRound className="h-5 w-5 text-purple-600" />}
          description="Active JWT keys"
        />
        <StatCard
          title="Audit Volume"
          value={metrics?.total_audit_records || 0}
          icon={<Terminal className="h-5 w-5 text-amber-600" />}
          description="Compliance event logs"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* User Account Registry Panel */}
        <Card title="System Account Registry" className="lg:col-span-2">
          {isUsersLoading ? (
            <p className="text-xs text-gray-500 italic">Retrieving user accounts...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0E1116]">
                <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-150">
                  <tr>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Role</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {users?.map((u: UserRecord) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{u.email}</td>
                      <td className="px-4 py-3 capitalize">{u.role.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            u.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant={u.status === 'active' ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          isLoading={updateStatusMutation.isPending}
                          className="h-7 text-[10px] px-2.5 py-0.5"
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Audit Frequencies Chart */}
        <Card title="Compliance Log Frequencies">
          {chartData.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-10">No events tracked yet.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '11px' }} />
                  <Bar dataKey="Count" fill="#0B63CE" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Audit Log Timeline */}
      <Card title="HIPAA Security Audit Timeline">
        {!logs || logs.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Timeline logs are empty.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-3 divide-y divide-gray-100">
            {logs.map((log: AuditRecord) => (
              <div key={log.id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="rounded bg-gray-50 p-2 text-gray-500">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {log.action} on <span className="font-mono text-blue-600 font-bold">{log.target_table}</span>
                    </p>
                    <p className="text-[10px] text-gray-400">Target ID: {log.target_id || 'N/A'} | Operator ID: {log.user_id}</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold">{log.created_at.split('T')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
