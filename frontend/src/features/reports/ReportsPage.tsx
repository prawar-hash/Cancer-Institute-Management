import { useState } from 'react';
import { usePatientsList } from '../patients/patientApi.ts';
import { useGenerateReportPdf, useCreateShareLink } from './reportsApi.ts';
import { 
  Printer, Share2, Eye, X, Copy, Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import Card from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import Drawer from '../../components/ui/Drawer.tsx';

interface PatientRecord {
  id: number;
  mrn: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  status: string;
}

export default function ReportsPage() {
  const [page, setPage] = useState(1);
  const [previewPatientId, setPreviewPatientId] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [copiedTokenUrl, setCopiedTokenUrl] = useState<string | null>(null);

  // Queries
  const { data: patientData, isLoading: isPatientsLoading } = usePatientsList({ page, page_size: 15 });
  const patientsList = patientData?.patients || [];

  // Mutations
  const generatePdfMutation = useGenerateReportPdf();
  const createShareMutation = useCreateShareLink();

  const handleOpenPreview = async (patientId: number) => {
    setPreviewPatientId(patientId);
    try {
      const htmlContent = await generatePdfMutation.mutateAsync(patientId);
      setPreviewHtml(htmlContent);
    } catch {
      toast.error('Failed to generate clinical preview.');
      setPreviewPatientId(null);
    }
  };

  const handleClosePreview = () => {
    setPreviewPatientId(null);
    setPreviewHtml(null);
  };

  const handleCreateShareLink = async (patientId: number) => {
    try {
      const result = await createShareMutation.mutateAsync(patientId);
      // Construct full public URL
      const fullUrl = `${window.location.origin}${result.share_url}`;
      setCopiedTokenUrl(fullUrl);
      
      // Auto-copy to clipboard
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Secure share link copied to clipboard!');
    } catch {
      toast.error('Failed to create time-limited share link.');
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById('report-preview-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      toast.error('Printer interface not ready.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-xl font-bold text-[#0E1116]">Oncology Report Portal</h3>
          <p className="text-xs text-gray-400 font-semibold mt-1">Export, preview, and share HIPAA-compliant patient charts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Patients Listing */}
        <Card className="lg:col-span-2" title="Patient Clinical Ledger">
          {isPatientsLoading ? (
            <div className="flex h-48 items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-[#0B63CE]" />
              <span className="text-xs text-gray-500">Loading ledger...</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-150">
              {patientsList.map((patient: PatientRecord) => (
                <div key={patient.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {patient.first_name} {patient.last_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      MRN: <span className="font-mono text-gray-600 font-bold">{patient.mrn}</span> | Status: <span className="uppercase font-bold text-gray-600">{patient.status}</span>
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPreview(patient.id)}
                      isLoading={previewPatientId === patient.id && generatePdfMutation.isPending}
                      className="h-8 text-[11px] px-2.5"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCreateShareLink(patient.id)}
                      isLoading={createShareMutation.isPending && createShareMutation.variables === patient.id}
                      className="h-8 text-[11px] px-2.5 text-blue-700 hover:bg-blue-50"
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1" /> Get Link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Simple Pagination controls */}
          {patientData && patientData.total > 15 && (
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-150 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="h-8 text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 15 >= patientData.total}
                onClick={() => setPage(p => p + 1)}
                className="h-8 text-xs"
              >
                Next
              </Button>
            </div>
          )}
        </Card>

        {/* Share Token History / Details */}
        <Card title="Secured Sharing Status">
          {copiedTokenUrl ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-150 bg-emerald-50/50 p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-emerald-900">Secure Share Link Created!</h4>
                <p className="text-[10px] text-emerald-700 leading-relaxed">
                  A time-limited public token was registered. Access is valid for 24 hours. The URL has been copied to your clipboard.
                </p>
                <div className="flex items-center gap-2 rounded bg-white border border-emerald-200 px-3 py-1.5 mt-2">
                  <input
                    type="text"
                    readOnly
                    value={copiedTokenUrl}
                    className="flex-1 bg-transparent text-[10px] font-mono text-gray-600 outline-none truncate"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(copiedTokenUrl);
                      toast.success('Link copied!');
                    }}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                onClick={() => setCopiedTokenUrl(null)}
              >
                Clear History
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 space-y-2">
              <Share2 className="h-8 w-8 mx-auto text-gray-300" />
              <p className="text-xs italic leading-relaxed">
                Click "Get Link" to compile a tokenized clinical summary dashboard that can be shared securely with external referrers.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Preview Print-friendly iframe Drawer */}
      <Drawer
        isOpen={!!previewHtml}
        onClose={handleClosePreview}
        title="Clinical Document Print Preview"
        className="!max-w-4xl"
      >
        <div className="flex flex-col h-full">
          {/* Action Bar */}
          <div className="border-b border-gray-150 pb-3 mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Browser Sandbox</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePrint} className="h-8 text-xs px-3">
                <Printer className="h-4 w-4 mr-1.5" /> Print Summary
              </Button>
              <Button variant="secondary" size="sm" onClick={handleClosePreview} className="h-8 text-xs px-3">
                <X className="h-4 w-4 mr-1.5" /> Close
              </Button>
            </div>
          </div>

          {/* Report Display iframe container */}
          <div className="flex-1 rounded-lg border border-gray-200 bg-white overflow-hidden shadow-inner h-[60vh]">
            {previewHtml && (
              <iframe
                id="report-preview-frame"
                title="Clinical summary document preview"
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                sandbox="allow-modals allow-popups allow-print allow-scripts"
              />
            )}
          </div>
        </div>
      </Drawer>
    </div>
  );
}
