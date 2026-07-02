import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.ts';

// 1. Super Admin: System Accounts Listing
export function useSystemUsers() {
  return useQuery({
    queryKey: ['system-users'],
    queryFn: async () => {
      const response = await api.get('/api/v1/system/users');
      return response.data;
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: number; status: string }) => {
      const response = await api.put(`/api/v1/system/users/${userId}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
    },
  });
}

// 2. Super Admin: Audit Trails Timeline
export function useSystemAuditLogs() {
  return useQuery({
    queryKey: ['system-audit-logs'],
    queryFn: async () => {
      const response = await api.get('/api/v1/system/audit-logs');
      return response.data;
    },
  });
}

// 3. Super Admin: Hardware / DB Metrics Check
export function useSystemMetrics() {
  return useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const response = await api.get('/api/v1/system/metrics');
      return response.data;
    },
  });
}
