import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.ts';

// 1. Get list of available research studies
export function useResearchDatasets() {
  return useQuery({
    queryKey: ['research-datasets'],
    queryFn: async () => {
      const response = await api.get('/api/v1/research/datasets');
      return response.data;
    },
  });
}

// 2. Access Request hooks
export function useAccessRequests() {
  return useQuery({
    queryKey: ['research-access-requests'],
    queryFn: async () => {
      const response = await api.get('/api/v1/research/requests');
      return response.data;
    },
  });
}

export function useCreateAccessRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datasetId: number) => {
      const response = await api.post('/api/v1/research/requests', { dataset_id: datasetId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-access-requests'] });
    },
  });
}

export function useApproveAccessRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: string }) => {
      const response = await api.put(`/api/v1/research/requests/${requestId}/approve`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-access-requests'] });
    },
  });
}

// 3. Cohort Explorer hook
export function useCohortExplorer(filters: Record<string, string>) {
  return useQuery({
    queryKey: ['research-cohort', filters],
    queryFn: async () => {
      const response = await api.get('/api/v1/research/cohort', { params: filters });
      return response.data;
    },
  });
}
