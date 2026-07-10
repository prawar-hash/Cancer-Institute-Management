/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { UserPlus, Power, FileHeart } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import CameraFlow from "../camera/CameraFlow";
import axios from 'axios';
import { usePatientsList, useRegisterPatient } from './patientApi.ts';
import { RootState } from '../../app/store.ts';
import Button from '../../components/ui/Button.tsx';
import Card from '../../components/ui/Card.tsx';
import Modal from '../../components/ui/Modal.tsx';
import DataTable from '../../components/shared/DataTable.tsx';
import FilterBar from '../../components/shared/FilterBar.tsx';

// Patient Registration Zod Validation Schema
const patientSchema = z.object({
  mrn: z.string().min(3, 'MRN must be at least 3 characters long'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  birth_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid birth date',
  }),
  gender: z.enum(['M', 'F', 'O'], {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  status: z.string().default('active'),
});



interface PatientRecord {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  status: string;
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  // 👇 YAHI ADD KARNA HAI
  const [openCamera, setOpenCamera] = useState(false);
  const [showCameraOption, setShowCameraOption] = useState(false);
  // Dynamic filter states
  const [filters, setFilters] = useState({
    q: '',
    gender: '',
    status: '',
    stage: '',
    treatment_type: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to page 1 on filter changes
  };

  const handleClearFilters = () => {
    setFilters({
      q: '',
      gender: '',
      status: '',
      stage: '',
      treatment_type: '',
    });
    setPage(1);
  };

  // TanStack Query list fetcher
  const queryParams = {
    ...filters,
    page,
    page_size: 15,
  };
  const { data, isLoading } = usePatientsList(queryParams);
  const registerMutation = useRegisterPatient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(patientSchema),
  });

  const handleRegisterSubmit = async (formData: any) => {
    try {
      await registerMutation.mutateAsync(formData);
      toast.success('Patient registered successfully!');
      setIsModalOpen(false);
      reset();
    } catch (err: unknown) {
      let errorMsg = 'Failed to register patient';
      if (axios.isAxiosError(err)) {
        errorMsg = err.response?.data?.detail || errorMsg;
      }
      toast.error(errorMsg);
    }
  };

  // Define table column headers
  const columns: ColumnDef<PatientRecord>[] = [
    {
      accessorKey: 'mrn',
      header: 'MRN',
      cell: (info) => <span className="font-mono font-bold text-gray-700">{String(info.getValue())}</span>,
    },
    {
      header: 'Name',
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
      cell: (info) => <span className="font-semibold text-[#0E1116]">{String(info.getValue())}</span>,
    },
    {
      accessorKey: 'birth_date',
      header: 'Birth Date',
    },
    {
      accessorKey: 'gender',
      header: 'Gender',
      cell: (info) => {
        const val = String(info.getValue());
        return val === 'M' ? 'Male' : val === 'F' ? 'Female' : 'Other';
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const val = String(info.getValue());
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${val === 'active'
              ? 'bg-emerald-50 text-emerald-700'
              : val === 'deceased'
                ? 'bg-red-50 text-red-700'
                : 'bg-gray-150 text-gray-600'
              }`}
          >
            {val}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const patient = info.row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="h-8 text-xs px-2.5 py-1"
            >
              View Profile
            </Button>
            {currentUser?.role !== 'student' && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs text-red-600 hover:bg-red-50 px-2.5 py-1"
                onClick={() => toast.error('Deactivation operations are mocked.')}
              >
                <Power className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const totalCount = data?.total || 0;
  const patientsList = data?.patients || [];

  return (
    <div className="space-y-6">
      {/* Upper Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-[#0B63CE]/10 p-3 text-[#0B63CE]">
            <FileHeart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Registry</p>
            <h4 className="font-heading mt-1 text-2xl font-extrabold text-[#0E1116]">{totalCount}</h4>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
            <FileHeart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Care Plans</p>
            <h4 className="font-heading mt-1 text-2xl font-extrabold text-emerald-600">
              {patientsList.filter((p: PatientRecord) => p.status === 'active').length}
            </h4>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="rounded-lg bg-red-50 p-3 text-red-600">
            <FileHeart className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Deceased Logs</p>
            <h4 className="font-heading mt-1 text-2xl font-extrabold text-red-600">
              {patientsList.filter((p: PatientRecord) => p.status === 'deceased').length}
            </h4>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl font-bold text-[#0E1116]">Patient Demographics Directory</h3>
        {currentUser?.role !== 'student' && (
          <Button onClick={() => setIsModalOpen(true)} className="h-10 text-sm font-semibold px-4 py-2">
            <UserPlus className="mr-1.5 h-4.5 w-4.5" /> Register Patient
          </Button>
        )}
      </div>

      {/* Reusable Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {/* Main Table Grid */}
      <DataTable
        columns={columns}
        data={patientsList}
        totalCount={totalCount}
        page={page}
        pageSize={15}
        onPageChange={setPage}
        isLoading={isLoading}
      />

      {/* Registration Modal Dialog */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Patient Profile">
        <form onSubmit={handleSubmit(handleRegisterSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">First Name</label>
              <input
                type="text"
                {...register('first_name')}
                placeholder="Jane"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
              />
              {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Last Name</label>
              <input
                type="text"
                {...register('last_name')}
                placeholder="Doe"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
              />
              {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">MRN ID</label>
              <input
                type="text"
                {...register('mrn')}
                placeholder="MRN-88001"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
              />
              {errors.mrn && <p className="mt-1 text-xs text-red-600">{errors.mrn.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Birth Date</label>
              <input
                type="date"
                {...register('birth_date')}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
              />
              {errors.birth_date && <p className="mt-1 text-xs text-red-600">{errors.birth_date.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Gender</label>
            <select
              {...register('gender')}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0B63CE] focus:outline-none"
            >
              <option value="">Select Gender...</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
            {errors.gender && <p className="mt-1 text-xs text-red-600">{errors.gender.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button" className="h-9 text-xs">
              Cancel
            </Button>
            <Button type="submit" isLoading={registerMutation.isPending} className="h-9 text-xs">
              Register
            </Button>
          </div>

          {/* Upload Report Button */}
          <Button
            type="button"
            onClick={() => setShowCameraOption(true)}
            className="h-9 text-xs"
          >
            Upload Report
          </Button>

          {/* Ask User */}
          {showCameraOption && (
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                onClick={() => {
                  setOpenCamera(true);
                  setShowCameraOption(false);
                }}
                className="h-8 text-xs"
              >
                Use Camera
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCameraOption(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Camera Flow */}
          {openCamera && <CameraFlow />}

        </form>
      </Modal>
    </div>
  );
}
