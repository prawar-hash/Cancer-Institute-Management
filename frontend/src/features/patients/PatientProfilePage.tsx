/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, ShieldAlert, ClipboardList, Activity, Plus, FileSpreadsheet
} from 'lucide-react';
import axios from 'axios';

import { 
  usePatientDetails, usePatientDiagnoses, usePatientTreatments,
  usePatientPrescriptions, usePatientAppointments, usePatientFollowUps,
  usePatientReports, usePatientNotes, useAddDiagnosis, useAddTreatment,
  useAddNote, useUploadPatientFile 
} from './patientApi.ts';
import { RootState } from '../../app/store.ts';
import Button from '../../components/ui/Button.tsx';
import Card from '../../components/ui/Card.tsx';
import Modal from '../../components/ui/Modal.tsx';
import FileUploadZone from '../../components/shared/FileUploadZone.tsx';
import TreatmentDetailsWidget from './TreatmentDetailsWidget.tsx';

// Zod schemas for clinical additions
const noteSchema = z.object({
  note_text: z.string().min(5, 'Note text must be at least 5 characters long'),
  note_type: z.string().default('clinical'),
});

const diagnosisSchema = z.object({
  primary_site: z.string().min(1, 'Primary site is required'),
  histology: z.string().min(1, 'Histology details are required'),
  diagnosis_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date',
  }),
});

const treatmentSchema = z.object({
  type: z.enum(['surgery', 'chemo', 'radiation', 'immunotherapy', 'targeted']),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'suspended']),
  start_date: z.string(),
  end_date: z.string().optional(),
  doctor_id: z.number().default(10),
  details: z.object({
    // Surgery details
    procedure: z.string().optional(),
    margins: z.string().optional(),
    pathology_status: z.string().optional(),
    
    // Chemo details
    regimen: z.string().optional(),
    cycles_planned: z.string().optional(),
    drugs: z.string().optional(), // We'll split this by comma in submit
    
    // Radiation scheduling details (No radiation dose tracking fields here!)
    modality: z.string().optional(),
    target_site: z.string().optional(),
    technique: z.string().optional(),
    fractions_planned: z.string().optional(),
  }),
});



export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [activeTab, setActiveTab] = useState<'demographics' | 'timeline' | 'treatments' | 'notes' | 'files'>('demographics');
  
  // Modals visibility states
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isDiagModalOpen, setIsDiagModalOpen] = useState(false);
  const [isTreatmentModalOpen, setIsTreatmentModalOpen] = useState(false);
  const [selectedTreatmentType, setSelectedTreatmentType] = useState<string>('chemo');

  // Queries
  const { data: patient, isLoading: isPatientLoading } = usePatientDetails(patientId);
  const { data: diagnoses } = usePatientDiagnoses(patientId);
  const { data: treatments } = usePatientTreatments(patientId);
  const { data: prescriptions } = usePatientPrescriptions(patientId);
  const { data: appointments } = usePatientAppointments(patientId);
  const { data: followUps } = usePatientFollowUps(patientId);
  const { data: reports } = usePatientReports(patientId);
  const { data: notes } = usePatientNotes(patientId);

  // Mutations
  const addNoteMutation = useAddNote(patientId);
  const addDiagMutation = useAddDiagnosis(patientId);
  const addTreatmentMutation = useAddTreatment(patientId);
  const uploadFileMutation = useUploadPatientFile(patientId);

  // Forms hook validation mapping
  const { register: registerNote, handleSubmit: handleNoteSubmit, reset: resetNote, formState: { errors: noteErrors } } = useForm({ resolver: zodResolver(noteSchema) });
  const { register: registerDiag, handleSubmit: handleDiagSubmit, reset: resetDiag, formState: { errors: diagErrors } } = useForm({ resolver: zodResolver(diagnosisSchema) });
  const { register: registerTreatment, handleSubmit: handleTreatmentSubmit, reset: resetTreatment } = useForm({ resolver: zodResolver(treatmentSchema) });

  const onAddNoteSubmit = async (formData: any) => {
    try {
      await addNoteMutation.mutateAsync(formData);
      toast.success('Doctor note recorded!');
      setIsNoteModalOpen(false);
      resetNote();
    } catch {
      toast.error('Failed to save doctor note.');
    }
  };

  const onAddDiagSubmit = async (formData: any) => {
    try {
      await addDiagMutation.mutateAsync(formData);
      toast.success('Diagnosis registered!');
      setIsDiagModalOpen(false);
      resetDiag();
    } catch {
      toast.error('Failed to save diagnosis details.');
    }
  };

  const onAddTreatmentSubmit = async (formData: any) => {
    try {
      // Parse form data to compile structured details mapping
      const compiledDetails: Record<string, any> = {};
      if (formData.type === 'chemo') {
        compiledDetails.regimen = formData.details.regimen;
        compiledDetails.cycles_planned = Number(formData.details.cycles_planned) || 0;
        compiledDetails.drugs = formData.details.drugs ? formData.details.drugs.split(',').map((s: string) => s.trim()) : [];
      } else if (formData.type === 'surgery') {
        compiledDetails.procedure = formData.details.procedure;
        compiledDetails.margins = formData.details.margins;
        compiledDetails.pathology_status = formData.details.pathology_status;
      } else if (formData.type === 'radiation') {
        compiledDetails.modality = formData.details.modality;
        compiledDetails.target_site = formData.details.target_site;
        compiledDetails.technique = formData.details.technique;
        compiledDetails.fractions_planned = Number(formData.details.fractions_planned) || 0;
      }

      await addTreatmentMutation.mutateAsync({
        type: formData.type,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        doctor_id: formData.doctor_id,
        details: compiledDetails
      });

      toast.success('Treatment plan recorded!');
      setIsTreatmentModalOpen(false);
      resetTreatment();
    } catch (err: unknown) {
      let errorMsg = 'Failed to record treatment';
      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.detail || errorMsg;
      }
      toast.error(errorMsg);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      await uploadFileMutation.mutateAsync(file);
      toast.success('File uploaded to GCS successfully!');
    } catch (err: unknown) {
      let errorMsg = 'Failed to upload file';
      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.detail || errorMsg;
      }
      toast.error(errorMsg);
    }
  };

  // Compile timeline events
  const compileTimeline = () => {
    const events: { date: string; type: string; title: string; subtitle: string }[] = [];

    diagnoses?.forEach((d: any) => {
      events.push({
        date: d.diagnosis_date,
        type: 'diagnosis',
        title: `Diagnosis: ${d.primary_site}`,
        subtitle: `Histology: ${d.histology}`,
      });
    });

    treatments?.forEach((t: any) => {
      events.push({
        date: t.start_date,
        type: 'treatment',
        title: `Treatment Started: ${t.type.toUpperCase()}`,
        subtitle: `Status: ${t.status}`,
      });
    });

    prescriptions?.forEach((p: any) => {
      events.push({
        date: p.start_date,
        type: 'prescription',
        title: `Prescription: ${p.medication}`,
        subtitle: `Dosage: ${p.dosage} (${p.frequency})`,
      });
    });

    appointments?.forEach((a: any) => {
      events.push({
        date: a.appointment_date.split('T')[0],
        type: 'appointment',
        title: `Appointment: ${a.reason}`,
        subtitle: `Status: ${a.status}`,
      });
    });

    followUps?.forEach((f: any) => {
      events.push({
        date: f.schedule_date.split('T')[0],
        type: 'follow_up',
        title: 'Follow Up Schedule',
        subtitle: `Status: ${f.status} | Notes: ${f.notes || 'None'}`,
      });
    });

    // Sort events descending
    return events.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  };

  const timelineEvents = compileTimeline();

  if (isPatientLoading) {
    return (
      <div className="flex h-64 items-center justify-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0B63CE] border-t-transparent" />
        <span className="text-sm text-gray-500">Loading patient details...</span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        Patient record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/patients" className="rounded-lg border border-gray-200 bg-white p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-2xl font-bold text-[#0E1116]">
                {patient.first_name} {patient.last_name}
              </h2>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase text-blue-700">
                {patient.status}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400 mt-1">MRN ID: <span className="font-mono text-gray-600 font-bold">{patient.mrn}</span></p>
          </div>
        </div>
        
        {/* Clinician Action Buttons */}
        {currentUser?.role !== 'student' && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsDiagModalOpen(true)} className="h-9 text-xs">
              <ClipboardList className="mr-1.5 h-4 w-4" /> Add Diagnosis
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsTreatmentModalOpen(true)} className="h-9 text-xs">
              <Activity className="mr-1.5 h-4 w-4" /> Record Treatment
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsNoteModalOpen(true)} className="h-9 text-xs">
              <Plus className="mr-1.5 h-4 w-4" /> Add Note
            </Button>
          </div>
        )}
      </div>

      {/* Tabs list navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(['demographics', 'timeline', 'treatments', 'notes', 'files'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-semibold capitalize border-b-2 transition-colors focus:outline-none ${
                activeTab === tab
                  ? 'border-[#0B63CE] text-[#0B63CE]'
                  : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700'
              }`}
            >
              {tab === 'files' ? 'Reports & Files' : tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab contents viewport */}
      <div className="mt-6">
        {activeTab === 'demographics' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card title="Patient Information" className="md:col-span-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">MRN</span>
                  <span className="font-mono font-bold text-gray-700">{patient.mrn}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Birth Date</span>
                  <span className="font-semibold text-gray-800">{patient.birth_date}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Gender</span>
                  <span className="font-semibold text-gray-800">
                    {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">Active Status</span>
                  <span className="font-semibold text-gray-800 capitalize">{patient.status}</span>
                </div>
              </div>
            </Card>

            <Card title="Emergency Contacts">
              {patient.contacts.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No contacts registered (or restricted role).</p>
              ) : (
                <div className="space-y-4">
                  {patient.contacts.map((contact: any) => (
                    <div key={contact.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-semibold text-gray-800">{contact.contact_name}</p>
                      <p className="text-xs text-gray-400">{contact.relationship}</p>
                      {contact.phone && <p className="text-xs text-gray-600 mt-1">{contact.phone}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'timeline' && (
          <Card title="Clinical Event Log">
            {timelineEvents.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No events recorded on this patient's ledger.</p>
            ) : (
              <div className="relative border-l border-gray-200 pl-6 ml-2 space-y-6">
                {timelineEvents.map((event, index) => (
                  <div key={index} className="relative">
                    <span className={`absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white ${
                      event.type === 'diagnosis' ? 'bg-[#0B63CE]' :
                      event.type === 'treatment' ? 'bg-emerald-500' :
                      event.type === 'prescription' ? 'bg-amber-500' : 'bg-purple-500'
                    }`} />
                    <span className="text-[10px] font-bold text-gray-400 block">{event.date}</span>
                    <p className="text-sm font-semibold text-[#0E1116] mt-0.5">{event.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{event.subtitle}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-bold text-gray-800">Active & Past Treatment Plans</h4>
            {treatments?.length === 0 ? (
              <Card>
                <p className="text-xs text-gray-400 italic text-center py-6">No treatment regimens declared.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {treatments?.map((t: any) => (
                  <TreatmentDetailsWidget key={t.id} treatment={t} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            <h4 className="font-heading text-lg font-bold text-gray-800">Attending Doctor Notes</h4>
            {notes?.length === 0 ? (
              <Card>
                <p className="text-xs text-gray-400 italic text-center py-6">No clinical or research notes logged.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {notes?.map((n: any) => (
                  <Card key={n.id}>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                      <span className="text-[10px] font-bold text-[#0B63CE] uppercase tracking-wider bg-[#0B63CE]/5 px-2 py-0.5 rounded">
                        {n.note_type}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{n.created_at.split('T')[0]}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#0E1116] whitespace-pre-wrap">{n.note_text}</p>
                    <p className="text-[10px] text-gray-400 mt-2 text-right">Written by Doctor ID: {n.doctor_id}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card title="Uploaded Medical Scans & Reports">
                {reports?.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No PDF reports or radiology scans uploaded.</p>
                ) : (
                  <div className="divide-y divide-gray-150">
                    {reports?.map((r: any) => (
                      <div key={r.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-gray-50 p-2 text-gray-400">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 capitalize">{r.type} Report</p>
                            <p className="text-[10px] font-mono text-gray-400 truncate max-w-xs">{r.gcs_uri}</p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                          r.status === 'processed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div>
              {currentUser?.role !== 'student' ? (
                <Card title="Upload Document / Capture">
                  <FileUploadZone onFileSelect={handleFileUpload} />
                </Card>
              ) : (
                <Card className="border-amber-100 bg-amber-50/50">
                  <div className="flex gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900">Upload Blocked</h4>
                      <p className="text-[10px] text-amber-700 leading-relaxed mt-1">
                        Student roles are restricted to read-only research portal capabilities and cannot upload medical files.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 1. Add Note Dialog */}
      <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Record Doctor Note">
        <form onSubmit={handleNoteSubmit(onAddNoteSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Note Type</label>
            <select
              {...registerNote('note_type')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
            >
              <option value="clinical">Clinical Observation</option>
              <option value="surgical">Surgical Notes</option>
              <option value="research">Research Cohort Entry</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Clinical Narrative</label>
            <textarea
              {...registerNote('note_text')}
              rows={4}
              placeholder="Record recent updates, medication compliance details, or research findings..."
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
            />
            {noteErrors.note_text && <p className="mt-1 text-xs text-red-600">{noteErrors.note_text.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsNoteModalOpen(false)} type="button" className="h-9 text-xs">
              Cancel
            </Button>
            <Button type="submit" isLoading={addNoteMutation.isPending} className="h-9 text-xs">
              Record Note
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Add Diagnosis Dialog */}
      <Modal isOpen={isDiagModalOpen} onClose={() => setIsDiagModalOpen(false)} title="Record Oncology Diagnosis">
        <form onSubmit={handleDiagSubmit(onAddDiagSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Primary Cancer Site</label>
            <input
              type="text"
              {...registerDiag('primary_site')}
              placeholder="Lung (Lower Lobe), Breast (Outer Quadrant)"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
            />
            {diagErrors.primary_site && <p className="mt-1 text-xs text-red-600">{diagErrors.primary_site.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Histology Classification</label>
            <input
              type="text"
              {...registerDiag('histology')}
              placeholder="Adenocarcinoma, Infiltrating Ductal"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
            />
            {diagErrors.histology && <p className="mt-1 text-xs text-red-600">{diagErrors.histology.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Diagnosis Date</label>
            <input
              type="date"
              {...registerDiag('diagnosis_date')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
            />
            {diagErrors.diagnosis_date && <p className="mt-1 text-xs text-red-600">{diagErrors.diagnosis_date.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsDiagModalOpen(false)} type="button" className="h-9 text-xs">
              Cancel
            </Button>
            <Button type="submit" isLoading={addDiagMutation.isPending} className="h-9 text-xs">
              Register Diagnosis
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Add Treatment Dialog */}
      <Modal isOpen={isTreatmentModalOpen} onClose={() => setIsTreatmentModalOpen(false)} title="Record Treatment Plan">
        <form onSubmit={handleTreatmentSubmit(onAddTreatmentSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Modality Type</label>
              <select
                {...registerTreatment('type')}
                onChange={(e) => setSelectedTreatmentType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
              >
                <option value="chemo">Chemotherapy</option>
                <option value="surgery">Surgery</option>
                <option value="radiation">Radiotherapy</option>
                <option value="immunotherapy">Immunotherapy</option>
                <option value="targeted">Targeted Therapy</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Current Status</label>
              <select
                {...registerTreatment('status')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
              >
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Start Date</label>
              <input
                type="date"
                {...registerTreatment('start_date')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">End Date (Optional)</label>
              <input
                type="date"
                {...registerTreatment('end_date')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Polymorphic detail view panels in form */}
          {selectedTreatmentType === 'chemo' && (
            <div className="border-t border-gray-150 pt-3 space-y-3">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chemotherapy Parameters</h5>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400">Regimen Name</label>
                <input
                  type="text"
                  {...registerTreatment('details.regimen')}
                  placeholder="FOLFOX, AC-T, GemCarbo"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">Total Cycles</label>
                  <input
                    type="text"
                    {...registerTreatment('details.cycles_planned')}
                    placeholder="6"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">Drugs (Comma Separated)</label>
                  <input
                    type="text"
                    {...registerTreatment('details.drugs')}
                    placeholder="Doxorubicin, Cyclophosphamide"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedTreatmentType === 'surgery' && (
            <div className="border-t border-gray-150 pt-3 space-y-3">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Surgical Parameters</h5>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400">Procedure Name</label>
                <input
                  type="text"
                  {...registerTreatment('details.procedure')}
                  placeholder="Partial Lobectomy, Lumpectomy"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">Margins Status</label>
                  <input
                    type="text"
                    {...registerTreatment('details.margins')}
                    placeholder="Negative, Positive (0.2mm)"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">Pathology Stage Outcomes</label>
                  <input
                    type="text"
                    {...registerTreatment('details.pathology_status')}
                    placeholder="ypT1bN0"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedTreatmentType === 'radiation' && (
            <div className="border-t border-gray-150 pt-3 space-y-3">
              <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Radiation Parameters</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">Modality</label>
                  <input
                    type="text"
                    {...registerTreatment('details.modality')}
                    placeholder="EBRT, Brachytherapy"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">Target Site</label>
                  <input
                    type="text"
                    {...registerTreatment('details.target_site')}
                    placeholder="Prostate Bed, Breast"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">Technique</label>
                  <input
                    type="text"
                    {...registerTreatment('details.technique')}
                    placeholder="IMRT, SBRT"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400">Fractions Total</label>
                  <input
                    type="text"
                    {...registerTreatment('details.fractions_planned')}
                    placeholder="28"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-[#0B63CE] focus:outline-none"
                  />
                </div>
              </div>
              {/* Note detailing that we do NOT store dosage tracking values */}
              <p className="text-[10px] text-gray-400 mt-2">
                *Note: Radiation logs only document administrative target scheduling metrics. Dose Gy monitoring is locked.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsTreatmentModalOpen(false)} type="button" className="h-9 text-xs">
              Cancel
            </Button>
            <Button type="submit" isLoading={addTreatmentMutation.isPending} className="h-9 text-xs">
              Save Treatment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
