import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import {
  AuditFiltersBar,
  defaultAuditFilters,
  type AuditFiltersState,
} from '../components/audit/AuditFiltersBar'
import { AuditTable } from '../components/audit/AuditTable'
import { AuditDiffDialog } from '../components/audit/AuditDiffDialog'
import { useAuditLog, type AuditLogRow } from '../lib/dashboards-queries'
import { supabase } from '../lib/supabase'
import { mapError } from '../lib/error-mapper'
import type { Profile } from '../types/profile'

const PAGE_SIZE = 50

export default function AdminAuditoriaPage(): React.ReactElement {
  const [filters, setFilters] = React.useState<AuditFiltersState>(
    defaultAuditFilters,
  )
  const [cursorStack, setCursorStack] = React.useState<number[]>([])
  const [diffRow, setDiffRow] = React.useState<AuditLogRow | null>(null)
  const [diffOpen, setDiffOpen] = React.useState(false)

  // Reset pagination when filters change.
  const filtersKey = React.useMemo(
    () =>
      [
        filters.usuarioId,
        filters.entidade,
        filters.acao,
        filters.dataDe,
        filters.dataAte,
      ].join('|'),
    [filters],
  )
  React.useEffect(() => {
    setCursorStack([])
  }, [filtersKey])

  const cursor = cursorStack.length > 0
    ? cursorStack[cursorStack.length - 1]
    : null
  const auditQ = useAuditLog({
    usuarioId: filters.usuarioId,
    entidade: filters.entidade,
    acao: filters.acao,
    dataDe: filters.dataDe,
    dataAte: filters.dataAte,
    pageSize: PAGE_SIZE,
    cursor,
  })

  const profilesQ = useQuery({
    queryKey: ['admin', 'profiles', 'audit'] as const,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('nome_completo', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 1000 * 60 * 5,
  })

  const errorMsg = React.useMemo(() => {
    if (auditQ.error) return mapError(auditQ.error).description
    if (profilesQ.error) return mapError(profilesQ.error).description
    return null
  }, [auditQ.error, profilesQ.error])

  const rows = auditQ.data ?? []
  const hasMore = rows.length === PAGE_SIZE
  const pageNumber = cursorStack.length + 1

  const handleViewDiff = React.useCallback((row: AuditLogRow): void => {
    setDiffRow(row)
    setDiffOpen(true)
  }, [])

  const handleNext = (): void => {
    if (!hasMore) return
    const last = rows[rows.length - 1]
    if (!last) return
    setCursorStack((stack) => [...stack, last.id])
  }

  const handlePrev = (): void => {
    setCursorStack((stack) => stack.slice(0, -1))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        description="Histórico de alterações em entidades sensíveis."
      />

      <AuditFiltersBar
        value={filters}
        onChange={setFilters}
        profiles={profilesQ.data ?? []}
        loadingProfiles={profilesQ.isLoading}
      />

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar auditoria</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <AuditTable
            data={rows}
            loading={auditQ.isLoading}
            onViewDiff={handleViewDiff}
          />
          <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3 text-sm">
            <span className="text-xs text-muted-foreground">
              Página {pageNumber} · {rows.length} resultado(s)
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePrev}
                disabled={cursorStack.length === 0 || auditQ.isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleNext}
                disabled={!hasMore || auditQ.isFetching}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AuditDiffDialog
        row={diffRow}
        open={diffOpen}
        onOpenChange={setDiffOpen}
      />
    </div>
  )
}
