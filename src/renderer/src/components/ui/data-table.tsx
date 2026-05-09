import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowDownUp, ArrowUp, Inbox } from 'lucide-react'
import { Skeleton } from './skeleton'
import { EmptyState } from './empty-state'
import { DataTablePagination } from './data-table-pagination'
import { cn } from '../../lib/cn'

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  isLoading?: boolean
  emptyMessage?: string
  emptyTitle?: string
  emptyIcon?: React.ReactNode
  emptyAction?: React.ReactNode
  /** Enable row virtualization (recommended only when data > 100 rows). */
  virtualize?: boolean
  stickyFooter?: React.ReactNode
  rowClassName?: (row: TData) => string | undefined
  onRowClick?: (row: TData) => void
  /** Hide pagination controls (e.g., for short, fully-rendered tables). */
  hidePagination?: boolean
  /** Default page size (must match one of the page-size options). */
  defaultPageSize?: number
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  emptyTitle,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyIcon,
  emptyAction,
  virtualize,
  stickyFooter,
  rowClassName,
  onRowClick,
  hidePagination,
  defaultPageSize = 20,
}: DataTableProps<TData>): React.ReactElement {
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable<TData>({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: hidePagination ? undefined : getPaginationRowModel(),
    initialState: { pagination: { pageSize: defaultPageSize } },
  })

  if (isLoading) {
    return <TableSkeleton columns={columns.length} />
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon ?? <Inbox />}
        title={emptyTitle ?? emptyMessage}
        description={emptyTitle ? emptyMessage : undefined}
        action={emptyAction}
      />
    )
  }

  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-muted/50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const sort = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="border-b px-4 py-3 text-left font-medium first:pl-6 last:pr-6"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sort === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sort === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowDownUp className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          {virtualize ? (
            <VirtualBody
              rows={rows}
              colSpan={columns.length}
              rowClassName={rowClassName}
              onRowClick={onRowClick}
            />
          ) : (
            <tbody>
              {rows.map((row) => (
                <DataRow
                  key={row.id}
                  row={row}
                  rowClassName={rowClassName}
                  onRowClick={onRowClick}
                />
              ))}
            </tbody>
          )}
          {stickyFooter ? (
            <tfoot className="sticky bottom-0 bg-muted/80 backdrop-blur">
              {stickyFooter}
            </tfoot>
          ) : null}
        </table>
      </div>

      {!hidePagination ? <DataTablePagination table={table} /> : null}
    </div>
  )
}

interface DataRowProps<TData> {
  row: Row<TData>
  rowClassName?: (row: TData) => string | undefined
  onRowClick?: (row: TData) => void
}

function DataRow<TData>({
  row,
  rowClassName,
  onRowClick,
}: DataRowProps<TData>): React.ReactElement {
  return (
    <tr
      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
      className={cn(
        'border-b transition-colors hover:bg-muted/40',
        onRowClick && 'cursor-pointer',
        rowClassName?.(row.original),
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="border-b px-4 py-3 align-middle first:pl-6 last:pr-6"
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  )
}

interface VirtualBodyProps<TData> {
  rows: Row<TData>[]
  colSpan: number
  rowClassName?: (row: TData) => string | undefined
  onRowClick?: (row: TData) => void
}

function VirtualBody<TData>({
  rows,
  colSpan,
  rowClassName,
  onRowClick,
}: VirtualBodyProps<TData>): React.ReactElement {
  const parentRef = React.useRef<HTMLTableSectionElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 12,
  })
  const items = virtualizer.getVirtualItems()
  const total = virtualizer.getTotalSize()
  const first = items[0]
  const last = items[items.length - 1]
  const padTop = first ? first.start : 0
  const padBottom = last ? total - last.end : 0

  return (
    <tbody ref={parentRef} className="block max-h-[60vh] overflow-y-auto">
      {padTop > 0 ? (
        <tr style={{ height: padTop }}>
          <td colSpan={colSpan} />
        </tr>
      ) : null}
      {items.map((vi) => {
        const row = rows[vi.index]
        if (!row) return null
        return (
          <DataRow
            key={row.id}
            row={row}
            rowClassName={rowClassName}
            onRowClick={onRowClick}
          />
        )
      })}
      {padBottom > 0 ? (
        <tr style={{ height: padBottom }}>
          <td colSpan={colSpan} />
        </tr>
      ) : null}
    </tbody>
  )
}

function TableSkeleton({ columns }: { columns: number }): React.ReactElement {
  const cells = Array.from({ length: columns })
  return (
    <div className="space-y-3 p-6">
      <div className="flex gap-4">
        {cells.map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {cells.map((_, j) => <Skeleton key={j} className="h-9 flex-1" />)}
        </div>
      ))}
    </div>
  )
}
