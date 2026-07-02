import Card from '../../components/ui/Card.tsx';

interface TreatmentDetails {
  id: number;
  type: string; // surgery, chemo, radiation, immunotherapy, targeted
  status: string;
  start_date: string;
  end_date: string | null;
  doctor_id: number;
  details: Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface TreatmentDetailsWidgetProps {
  treatment: TreatmentDetails;
}

export default function TreatmentDetailsWidget({ treatment }: TreatmentDetailsWidgetProps) {
  const { type, status, start_date, end_date, details } = treatment;

  const renderPolymorphicDetails = () => {
    if (!details) {
      return <p className="text-xs text-gray-400 italic">No specific details recorded.</p>;
    }

    switch (type.toLowerCase()) {
      case 'surgery':
        return (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Surgery Details</h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">Procedure:</span>{' '}
                <span className="font-semibold text-gray-800">{details.procedure || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Surgeon ID:</span>{' '}
                <span className="font-semibold text-gray-800">{details.surgeon_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Surgical Margins:</span>{' '}
                <span className="font-semibold text-gray-800">{details.margins || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Pathology Result:</span>{' '}
                <span className="font-semibold text-gray-800">{details.pathology_status || 'N/A'}</span>
              </div>
            </div>
          </div>
        );

      case 'chemo':
      case 'chemotherapy':
        return (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Chemotherapy Details</h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">Regimen:</span>{' '}
                <span className="font-semibold text-[#0B63CE]">{details.regimen || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Cycles Planned:</span>{' '}
                <span className="font-semibold text-gray-800">{details.cycles_planned || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Cycle Number:</span>{' '}
                <span className="font-semibold text-gray-800">{details.cycle_current || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Medications:</span>{' '}
                <span className="font-semibold text-gray-800">
                  {Array.isArray(details.drugs) ? details.drugs.join(', ') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'radiation':
      case 'radiotherapy':
        return (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Radiation Scheduling</h5>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-gray-500">Modality:</span>{' '}
                <span className="font-semibold text-gray-800">{details.modality || 'EBRT (External Beam)'}</span>
              </div>
              <div>
                <span className="text-gray-500">Anatomical Site:</span>{' '}
                <span className="font-semibold text-gray-800">{details.target_site || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Sessions Total:</span>{' '}
                <span className="font-semibold text-gray-800">{details.fractions_planned || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Technique:</span>{' '}
                <span className="font-semibold text-gray-800">{details.technique || 'IMRT'}</span>
              </div>
            </div>
            {/* Strict check verifying no radiation dose parameters leak */}
            {(details.dose_gy || details.dose || details.cumulative_dose) && (
              <div className="mt-2 rounded bg-amber-50 p-2 text-[10px] text-amber-700 font-medium">
                ⚠️ Warning: Internal radiation dose logs are locked or restricted.
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Treatment Plan Details</h5>
            <pre className="rounded-lg bg-gray-50 p-3 text-[11px] text-gray-600 font-mono overflow-x-auto max-h-24">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <Card className="hover:border-gray-300 transition-colors">
      <div className="mb-4 flex items-center justify-between border-b border-gray-150 pb-2">
        <div>
          <span className="inline-flex rounded-full bg-[#0B63CE]/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#0B63CE]">
            {type}
          </span>
          <span className="ml-2 text-xs text-gray-400 font-semibold">{start_date} to {end_date || 'Ongoing'}</span>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            status === 'completed'
              ? 'bg-emerald-50 text-emerald-700'
              : status === 'active' || status === 'ongoing'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {status}
        </span>
      </div>
      {renderPolymorphicDetails()}
    </Card>
  );
}
