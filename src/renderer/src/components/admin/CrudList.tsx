import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import { PageHeader } from '../PageHeader'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { DataTable } from '../ui/data-table'

interface CrudListProps<TRow> {
  title: string
  description?: string
  columns: ColumnDef<TRow, unknown>[]
  data: TRow[]
  isLoading: boolean
  errorMsg: string | null
  emptyMessage?: string
  createLabel?: string
  hideCreate?: boolean
  onCreate?: () => void
  banner?: React.ReactNode
  toolbar?: React.ReactNode
}

export function CrudList<TRow>({
  title,
  description,
  columns,
  data,
  isLoading,
  errorMsg,
  emptyMessage,
  createLabel = '+ Novo',
  hideCreate,
  onCreate,
  banner,
  toolbar,
}: CrudListProps<TRow>): React.ReactElement {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          hideCreate || !onCreate ? undefined : (
            <Button type="button" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              {createLabel}
            </Button>
          )
        }
      />

      {banner}
      {toolbar}

      {errorMsg ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <DataTable<TRow>
            columns={columns}
            data={data}
            isLoading={isLoading}
            emptyMessage={emptyMessage ?? 'Nenhum registro encontrado.'}
          />
        </CardContent>
      </Card>
    </div>
  )
}
