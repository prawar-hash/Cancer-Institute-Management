import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
}

export default function DataTable<TData, TValue>({
  columns,
  data,
  totalCount = 0,
  page = 1,
  pageSize = 20,
  onPageChange,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="w-full">
      <div className="relative overflow-x-auto rounded-xl border border-gray-150 bg-white">
        <table className="w-full text-left text-sm text-[#0E1116]">
          <thead className="bg-gray-50 font-heading text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-150">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-6 py-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-150">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0B63CE] border-t-transparent" />
                    <span>Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                  No records found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {onPageChange && totalCount > 0 && (
        <div className="mt-4 flex items-center justify-between px-2">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold">{Math.min(totalCount, (page - 1) * pageSize + 1)}</span> to{' '}
            <span className="font-semibold">{Math.min(totalCount, page * pageSize)}</span> of{' '}
            <span className="font-semibold">{totalCount}</span> entries
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
