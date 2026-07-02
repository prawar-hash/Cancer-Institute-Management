import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.ts';

// 1. Patient Demographics & Directory Listing
export function usePatientsList(params: Record<string, unknown>) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: async () => {
      const response = await api.get('/api/v1/patients', { params });
      return response.data;
    },
  });
}

export function useRegisterPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patientData: Record<string, unknown>) => {
      const response = await api.post('/api/v1/patients', patientData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function usePatientDetails(patientId: number) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

// 2. Medical History
export function usePatientHistory(patientId: number) {
  return useQuery({
    queryKey: ['patient-history', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}/history`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

export function useUpdateHistory(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (historyData: Record<string, unknown>) => {
      const response = await api.put(`/api/v1/patients/${patientId}/history`, historyData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-history', patientId] });
    },
  });
}

// 3. Clinical Diagnoses
export function usePatientDiagnoses(patientId: number) {
  return useQuery({
    queryKey: ['patient-diagnoses', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}/diagnoses`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

export function useAddDiagnosis(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (diagnosisData: Record<string, unknown>) => {
      const response = await api.post(`/api/v1/patients/${patientId}/diagnoses`, diagnosisData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-diagnoses', patientId] });
    },
  });
}

// 4. Clinical Treatments
export function usePatientTreatments(patientId: number) {
  return useQuery({
    queryKey: ['patient-treatments', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}/treatments`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

export function useAddTreatment(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (treatmentData: Record<string, unknown>) => {
      const response = await api.post(`/api/v1/patients/${patientId}/treatments`, treatmentData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-treatments', patientId] });
    },
  });
}

// 5. Prescriptions
export function usePatientPrescriptions(patientId: number) {
  return useQuery({
    queryKey: ['patient-prescriptions', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}/prescriptions`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

export function useAddPrescription(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rxData: Record<string, unknown>) => {
      const response = await api.post(`/api/v1/patients/${patientId}/prescriptions`, rxData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-prescriptions', patientId] });
    },
  });
}

// 6. Appointments
export function usePatientAppointments(patientId: number) {
  return useQuery({
    queryKey: ['patient-appointments', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}/appointments`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

export function useAddAppointment(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (aptData: Record<string, unknown>) => {
      const response = await api.post(`/api/v1/patients/${patientId}/appointments`, aptData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointments', patientId] });
    },
  });
}

// 7. Follow Ups
export function usePatientFollowUps(patientId: number) {
  return useQuery({
    queryKey: ['patient-follow-ups', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}/follow-ups`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

export function useAddFollowUp(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fuData: Record<string, unknown>) => {
      const response = await api.post(`/api/v1/patients/${patientId}/follow-ups`, fuData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-follow-ups', patientId] });
    },
  });
}

// 8. Reports & GCS Uploads
export function usePatientReports(patientId: number) {
  return useQuery({
    queryKey: ['patient-reports', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}/reports`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

export function useUploadPatientFile(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/api/v1/patients/${patientId}/upload-file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-reports', patientId] });
    },
  });
}

export function usePatientNotes(patientId: number) {
  return useQuery({
    queryKey: ['patient-notes', patientId],
    queryFn: async () => {
      const response = await api.get(`/api/v1/patients/${patientId}/notes`);
      return response.data;
    },
    enabled: !!patientId,
  });
}

export function useAddNote(patientId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteData: Record<string, unknown>) => {
      const response = await api.post(`/api/v1/patients/${patientId}/notes`, noteData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-notes', patientId] });
    },
  });
}
