import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api.ts';

// 1. Generate patient clinical summary HTML report
export function useGenerateReportPdf() {
  return useMutation({
    mutationFn: async (patientId: number) => {
      const response = await api.post(`/api/v1/patients/${patientId}/pdf`);
      return response.data; // Raw HTML report string
    },
  });
}

// 2. Generate secure time-limited share links
export function useCreateShareLink() {
  return useMutation({
    mutationFn: async (patientId: number) => {
      const response = await api.post(`/api/v1/patients/${patientId}/share`);
      return response.data; // { share_url: string, expires_at: string }
    },
  });
}
