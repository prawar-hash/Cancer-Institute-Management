import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.ts';

// 1. Report Summarizations Mutation Hook
export function useReportSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reportId: number) => {
      const response = await api.post(`/api/v1/ai/summarize/${reportId}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related patient reports to reload summaries in UI
      queryClient.invalidateQueries({ queryKey: ['patient-reports'] });
    },
  });
}

// 2. Clinical Assistant Chatbot Mutation Hook
export function useSendChatMessage() {
  return useMutation({
    mutationFn: async ({ patientId, message }: { patientId: number; message: string }) => {
      const response = await api.post('/api/v1/ai/chat', { patient_id: patientId, message });
      return response.data;
    },
  });
}
