/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link } from 'react-router-dom';
import { usePatientsList } from '../patients/patientApi.ts';
import { Users, FileText, ClipboardPlus } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

import Card from '../../components/ui/Card.tsx';
import StatCard from '../../components/ui/StatCard.tsx';

// Colors for Recharts Stage distribution pie chart
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

// Mock datasets for enrollment and stages (to combine with active database counts)
const ENROLLMENT_DATA = [
  { month: 'Jan', Patients: 12 },
  { month: 'Feb', Patients: 19 },
  { month: 'Mar', Patients: 26 },
  { month: 'Apr', Patients: 34 },
  { month: 'May', Patients: 48 },
  { month: 'Jun', Patients: 62 },
];

const STAGE_DATA = [
  { name: 'Stage I', value: 35 },
  { name: 'Stage II', value: 25 },
  { name: 'Stage III', value: 20 },
  { name: 'Stage IV', value: 15 },
];

export default function AdminDashboard() {
  // Query 1. Recent Patients list
  const { data: patientData, isLoading: isPatientsLoading } = usePatientsList({ page_size: 5 });
  
  // Query 2. Reports details (mocked pending counts or dynamic stats)
  const patientsList = patientData?.patients || [];
  const totalEnrollment = patientData?.total || 62; // fallback to mock baseline

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Attending Cohort"
          value={totalEnrollment}
          icon={<Users className="h-5 w-5 text-blue-600" />}
          trend={{ value: '18% vs last month', isPositive: true }}
          description="Total enrolled patients"
        />
        <StatCard
          title="Unprocessed Scans"
          value={8} // Mock pending GCS uploads queue count
          icon={<FileText className="h-5 w-5 text-amber-600" />}
          description="Pathology/Radiology queue"
        />
        <StatCard
          title="Clinical Registrations"
          value="+4 New Today"
          icon={<ClipboardPlus className="h-5 w-5 text-emerald-600" />}
          description="Attending doctor logs"
        />
      </div>

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Enrollment Chart */}
        <Card title="Patient Registration Trends (YTD)" className="lg:col-span-2">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ENROLLMENT_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B63CE" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0B63CE" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }} />
                <Area type="monotone" dataKey="Patients" stroke="#0B63CE" strokeWidth={2} fillOpacity={1} fill="url(#colorPatients)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Stage Distribution Chart */}
        <Card title="Cancer Stage Breakdowns">
          <div className="h-72 w-full flex flex-col justify-between">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={STAGE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {STAGE_DATA.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {STAGE_DATA.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-gray-500 font-medium">{entry.name}:</span>
                  <span className="font-bold text-gray-800">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Grid: Recent Patients list & Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Patients Table */}
        <Card title="Recently Admitted Patients" className="lg:col-span-2">
          {isPatientsLoading ? (
            <p className="text-xs text-gray-500 italic">Loading registry...</p>
          ) : (
            <div className="divide-y divide-gray-150">
              {patientsList.map((patient: any) => (
                <div key={patient.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      MRN: <span className="font-mono text-gray-600 font-bold">{patient.mrn}</span> | Gender: {patient.gender}
                    </p>
                  </div>
                  <Link
                    to={`/patients/${patient.id}`}
                    className="text-xs font-semibold text-[#0B63CE] hover:text-[#0952AC] hover:underline"
                  >
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions Panel */}
        <Card title="Clinician Quick Actions">
          <div className="space-y-3 mt-1">
            <Link to="/patients">
              <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:bg-blue-50/50 hover:border-blue-200 transition-all text-xs font-bold text-gray-800">
                <span>View Full Registry</span>
                <span className="text-[#0B63CE]">→</span>
              </button>
            </Link>
            <Link to="/patients">
              <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:bg-blue-50/50 hover:border-blue-200 transition-all text-xs font-bold text-gray-800">
                <span>Register a Patient</span>
                <span className="text-[#0B63CE]">+</span>
              </button>
            </Link>
            <Link to="/reports">
              <button className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:bg-blue-50/50 hover:border-blue-200 transition-all text-xs font-bold text-gray-800">
                <span>Upload Medical Report</span>
                <span className="text-[#0B63CE]">↑</span>
              </button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
