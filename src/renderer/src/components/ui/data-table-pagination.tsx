import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Table } from '@tanstack/react-table'
import { Button } from './button'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>): React.ReactElement {
  const { pageIndex, pageSize } = table.getState().pagination
  const total = table.getFilteredRowModel().rows.length
  const start = total === 0 ? 0 : pageIndex * pageSize + 1
  const end = Math.min((pageIndex + 1) * pageSize, total)

  return (
    <div className="flex flex-col gap-2 border-t bg-muted/30 px-6 py-3 text-sm md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 text-muted-foreground">
        <span className="text-xs">Linhas por página</span>
        <select
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="hidden tabular-nums md:inline">
          {start}–{end} de {total}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <span className="px-1 text-xs text-muted-foreground tabular-nums">
          Página {pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
