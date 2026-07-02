import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Database, FolderKanban, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import Card from '../../components/ui/Card.tsx';
import StatCard from '../../components/ui/StatCard.tsx';
import Button from '../../components/ui/Button.tsx';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Mock research dataset records
const DATASETS = [
  { id: 1, name: 'Breast Cancer (Infiltrating Ductal) Study 2024', size: '2.4 MB', recordsCount: 142 },
  { id: 2, name: 'Lung Adenocarcinoma Cohort (Anonymized)', size: '1.8 MB', recordsCount: 98 },
  { id: 3, name: 'Prostate EBRT Target Site Outcomes', size: '940 KB', recordsCount: 64 },
];

const SITE_DATA = [
  { name: 'Breast', value: 45 },
  { name: 'Lung', value: 30 },
  { name: 'Prostate', value: 15 },
  { name: 'Other', value: 10 },
];

const AGE_DATA = [
  { range: '<40', Count: 14 },
  { range: '40-59', Count: 48 },
  { range: '60-79', Count: 72 },
  { range: '80+', Count: 8 },
];

export default function StudentDashboard() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | ''>('');
  const [requestReason, setRequestReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId || !requestReason) {
      toast.error('Please complete all form fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock API call submitting dataset request
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Access request submitted for review!');
      setSelectedDatasetId('');
      setRequestReason('');
    } catch {
      toast.error('Failed to submit access request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Studies Enrolled"
          value="3 Cohorts"
          icon={<FolderKanban className="h-5 w-5 text-blue-600" />}
          description="Access to active study nodes"
        />
        <StatCard
          title="Anonymized Entries"
          value={304}
          icon={<Database className="h-5 w-5 text-purple-600" />}
          description="De-identified patient summaries"
        />
        <StatCard
          title="Data Security Status"
          value="SECURE"
          icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
          description="HIPAA PII masking active"
        />
      </div>

      {/* Visualizations Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Site Distribution Pie Chart */}
        <Card title="Cohort Patient Distributions (Primary Sites)">
          <div className="h-64 w-full flex flex-col sm:flex-row items-center justify-around">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SITE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {SITE_DATA.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="space-y-2 text-xs">
              {SITE_DATA.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-gray-500 font-semibold">{entry.name}:</span>
                  <span className="font-bold text-gray-800">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Age Distribution Bar Chart */}
        <Card title="Cohort Patient Age Category Distributions">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={AGE_DATA} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: '12px' }} />
                <Bar dataKey="Count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Research Datasets Lists */}
        <Card title="Active Research Datasets" className="lg:col-span-2">
          <div className="divide-y divide-gray-150">
            {DATASETS.map((d) => (
              <div key={d.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Records: <span className="font-semibold text-gray-600">{d.recordsCount}</span> | File Size: {d.size}
                  </p>
                </div>
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  Dataset {d.id}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Request Download Form */}
        <Card title="Request Dataset Access">
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Select Dataset</label>
              <select
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#0B63CE] focus:outline-none"
              >
                <option value="">Choose Cohort...</option>
                {DATASETS.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Research Reason</label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={3}
                placeholder="Explain the academic justification or cohort analysis context..."
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-[#0B63CE] focus:outline-none"
              />
            </div>
            <Button type="submit" isLoading={isSubmitting} className="w-full py-2 text-xs font-bold mt-2">
              Submit Access Request
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
