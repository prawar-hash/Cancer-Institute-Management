/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  useResearchDatasets, useAccessRequests, useCreateAccessRequest, 
  useApproveAccessRequest, useCohortExplorer 
} from './researchApi.ts';
import { 
  ShieldAlert, FolderKanban, CheckCircle, XCircle, Clock, Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { RootState } from '../../app/store.ts';

import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';

interface DatasetRecord {
  id: number;
  name: string;
  description: string;
  criteria: Record<string, any> | null;
  status: string;
}

interface AccessRequestRecord {
  id: number;
  dataset_id: number;
  user_id: number;
  status: string;
  requested_at: string;
  approved_by: number | null;
}

interface AnonymizedPatient {
  id: number;
  first_name: string;
  last_name: string;
  mrn: string;
  birth_date: string;
  gender: string;
  status: string;
}

export default function ResearchPage() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [activeTab, setActiveTab] = useState<'explorer' | 'datasets'>('explorer');

  // Cohort explorer filter states
  const [filters, setFilters] = useState({
    gender: '',
    stage: '',
    treatment_type: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      gender: '',
      stage: '',
      treatment_type: '',
    });
  };

  // Queries
  const { data: cohortList, isLoading: isCohortLoading } = useCohortExplorer(filters);
  const { data: datasets, isLoading: isDatasetsLoading } = useResearchDatasets();
  const { data: requests } = useAccessRequests();

  // Mutations
  const createRequestMutation = useCreateAccessRequest();
  const approveRequestMutation = useApproveAccessRequest();

  const handleRequestAccess = async (datasetId: number) => {
    try {
      await createRequestMutation.mutateAsync(datasetId);
      toast.success('Access request submitted to oncologist review pipeline!');
    } catch {
      toast.error('Failed to submit access request.');
    }
  };

  const handleReviewRequest = async (requestId: number, reviewStatus: 'approved' | 'denied') => {
    try {
      await approveRequestMutation.mutateAsync({ requestId, status: reviewStatus });
      toast.success(`Access request marked as ${reviewStatus}!`);
    } catch {
      toast.error('Failed to review access request.');
    }
  };

  // Check request status for student buttons
  const getRequestStatus = (datasetId: number) => {
    if (!requests) return null;
    const req = requests.find((r: AccessRequestRecord) => r.dataset_id === datasetId);
    return req ? req.status : null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-xl font-bold text-[#0E1116]">Oncology Research & Cohorts Hub</h3>
        <p className="text-xs text-gray-400 font-semibold mt-1">
          Review clinical cohorts, browse anonymized study datasets, and manage approval queues.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-colors focus:outline-none ${
              activeTab === 'explorer'
                ? 'border-[#0B63CE] text-[#0B63CE]'
                : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700'
            }`}
          >
            Cohort Explorer
          </button>
          <button
            onClick={() => setActiveTab('datasets')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-colors focus:outline-none ${
              activeTab === 'datasets'
                ? 'border-[#0B63CE] text-[#0B63CE]'
                : 'border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700'
            }`}
          >
            Research Datasets & Approvals
          </button>
        </nav>
      </div>

      {/* Tab views */}
      <div className="mt-6">
        {activeTab === 'explorer' && (
          <div className="space-y-6">
            {/* Masking Alert Banner */}
            <div className="rounded-lg border border-blue-150 bg-blue-50/50 p-3.5 text-xs text-blue-800 flex items-start gap-2.5">
              <ShieldAlert className="h-4.5 w-4.5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Active Anonymizer Boundary:</span>
                <p className="mt-0.5 leading-relaxed">
                  All clinical cohort queries enforce HIPAA compliance boundaries. Names are masked, contacts are omitted, and MRN parameters are de-identified for academic users.
                </p>
              </div>
            </div>

            {/* Filter Card */}
            <Card title="Cohort Filter Metrics">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Gender</label>
                  <select
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#0B63CE] focus:outline-none bg-white font-semibold"
                  >
                    <option value="">All Genders...</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Cancer Stage</label>
                  <select
                    value={filters.stage}
                    onChange={(e) => handleFilterChange('stage', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#0B63CE] focus:outline-none bg-white font-semibold"
                  >
                    <option value="">All Stages...</option>
                    <option value="I">Stage I</option>
                    <option value="II">Stage II</option>
                    <option value="III">Stage III</option>
                    <option value="IV">Stage IV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Treatment Modality</label>
                  <select
                    value={filters.treatment_type}
                    onChange={(e) => handleFilterChange('treatment_type', e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#0B63CE] focus:outline-none bg-white font-semibold"
                  >
                    <option value="">All Treatments...</option>
                    <option value="chemo">Chemotherapy</option>
                    <option value="surgery">Surgery</option>
                    <option value="radiation">Radiotherapy</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={handleClearFilters} className="h-8 text-xs px-4">
                  Clear Filters
                </Button>
              </div>
            </Card>

            {/* Patients Ledger */}
            <Card title="Anonymized Patient Cohort Table">
              {isCohortLoading ? (
                <div className="flex h-32 items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0B63CE]" />
                  <span className="text-xs text-gray-500">Compiling cohort ledger...</span>
                </div>
              ) : !cohortList || cohortList.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-6">No matching patient profiles found in the registry.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#0E1116]">
                    <thead className="bg-gray-50 uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-150">
                      <tr>
                        <th className="px-4 py-2">Last Name</th>
                        <th className="px-4 py-2">First Name</th>
                        <th className="px-4 py-2">MRN</th>
                        <th className="px-4 py-2">Birth Date</th>
                        <th className="px-4 py-2">Gender</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {cohortList.map((p: AnonymizedPatient) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-800">{p.last_name}</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{p.first_name}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-500">{p.mrn}</td>
                          <td className="px-4 py-3 text-gray-600">{p.birth_date}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-150 text-gray-600'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'datasets' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Datasets List */}
            <Card title="Available Cohort Studies" className="lg:col-span-2">
              {isDatasetsLoading ? (
                <p className="text-xs text-gray-500 italic">Loading study registers...</p>
              ) : (
                <div className="divide-y divide-gray-150">
                  {datasets?.map((d: DatasetRecord) => {
                    const reqStatus = getRequestStatus(d.id);
                    return (
                      <div key={d.id} className="py-4.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-800">{d.name}</h4>
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                              {d.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{d.description}</p>
                          <pre className="mt-2 rounded bg-gray-50 p-2 text-[10px] font-mono text-gray-500 overflow-x-auto max-h-16">
                            Criteria: {JSON.stringify(d.criteria, null, 2)}
                          </pre>
                        </div>

                        {currentUser?.role === 'student' && (
                          <div className="shrink-0 pt-1">
                            {!reqStatus ? (
                              <Button
                                size="sm"
                                onClick={() => handleRequestAccess(d.id)}
                                isLoading={createRequestMutation.isPending}
                                className="h-8 text-xs font-bold px-3"
                              >
                                Request Access
                              </Button>
                            ) : reqStatus === 'approved' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                                <CheckCircle className="h-4 w-4" /> Approved
                              </span>
                            ) : reqStatus === 'denied' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                                <XCircle className="h-4 w-4" /> Denied
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                                <Clock className="h-4 w-4 animate-pulse" /> Pending Review
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Admin Approvals Queue */}
            <Card title="Approvals Workflow Queue">
              {currentUser?.role !== 'student' ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                    Attending physicians review requests for student cohort downloads.
                  </p>
                  
                  {!requests || requests.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-6 text-center">Requests queue is empty.</p>
                  ) : (
                    <div className="space-y-3.5 divide-y divide-gray-150">
                      {requests.map((r: AccessRequestRecord) => (
                        <div key={r.id} className="pt-3.5 first:pt-0 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-800">Request #{r.id}</span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                              r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                              r.status === 'denied' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {r.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500">
                            Dataset ID: <span className="font-bold text-gray-700">{r.dataset_id}</span> | Requester ID: {r.user_id}
                          </p>

                          {r.status === 'pending' && (
                            <div className="flex gap-2 pt-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleReviewRequest(r.id, 'approved')}
                                className="h-7 text-[10px] flex-1 bg-emerald-600 hover:bg-emerald-700 border-0"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleReviewRequest(r.id, 'denied')}
                                className="h-7 text-[10px] flex-1 text-red-600 hover:bg-red-50 border-red-200"
                              >
                                Deny
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400 space-y-2">
                  <FolderKanban className="h-8 w-8 mx-auto text-gray-300" />
                  <p className="text-xs italic leading-relaxed">
                    Student account logs. Your access request pipeline statuses will update automatically as administrators review submissions.
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
