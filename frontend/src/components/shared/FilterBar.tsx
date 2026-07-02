import { Search } from 'lucide-react';

interface FilterValues {
  q?: string;
  gender?: string;
  status?: string;
  stage?: string;
  treatment_type?: string;
}

interface FilterBarProps {
  filters: FilterValues;
  onFilterChange: (key: keyof FilterValues, value: string) => void;
  onClearFilters: () => void;
}

export default function FilterBar({
  filters,
  onFilterChange,
  onClearFilters,
}: FilterBarProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-150 bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patient or MRN..."
            value={filters.q || ''}
            onChange={(e) => onFilterChange('q', e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-[#0E1116] placeholder-gray-400 focus:border-[#0B63CE] focus:outline-none focus:ring-1 focus:ring-[#0B63CE]"
          />
        </div>

        {/* Gender */}
        <select
          value={filters.gender || ''}
          onChange={(e) => onFilterChange('gender', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0E1116] focus:border-[#0B63CE] focus:outline-none"
        >
          <option value="">All Genders</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="O">Other</option>
        </select>

        {/* Status */}
        <select
          value={filters.status || ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0E1116] focus:border-[#0B63CE] focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deceased">Deceased</option>
        </select>

        {/* Cancer Stage */}
        <select
          value={filters.stage || ''}
          onChange={(e) => onFilterChange('stage', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0E1116] focus:border-[#0B63CE] focus:outline-none"
        >
          <option value="">All Stages</option>
          <option value="I">Stage I</option>
          <option value="II">Stage II</option>
          <option value="IIB">Stage IIB</option>
          <option value="III">Stage III</option>
          <option value="IIIA">Stage IIIA</option>
          <option value="IV">Stage IV</option>
        </select>

        {/* Treatment Type */}
        <select
          value={filters.treatment_type || ''}
          onChange={(e) => onFilterChange('treatment_type', e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0E1116] focus:border-[#0B63CE] focus:outline-none"
        >
          <option value="">All Treatments</option>
          <option value="surgery">Surgery</option>
          <option value="chemo">Chemotherapy</option>
          <option value="radiation">Radiotherapy</option>
          <option value="immunotherapy">Immunotherapy</option>
          <option value="targeted">Targeted Therapy</option>
        </select>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={onClearFilters}
          className="text-xs font-semibold text-[#0B63CE] hover:text-[#0952AC] hover:underline focus:outline-none"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
