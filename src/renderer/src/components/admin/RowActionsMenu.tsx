import * as React from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface ExtraAction {
  key: string
  label: string
  icon?: React.ReactNode
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

interface RowActionsMenuProps {
  onEdit?: () => void
  onDelete?: () => void
  deleteLabel?: string
  editLabel?: string
  extraActions?: ExtraAction[]
}

export function RowActionsMenu({
  onEdit,
  onDelete,
  deleteLabel = 'Desativar',
  editLabel = 'Editar',
  extraActions,
}: RowActionsMenuProps): React.ReactElement {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon" variant="ghost" aria-label="Ações">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Ações</DropdownMenuLabel>
          {onEdit ? (
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              {editLabel}
            </DropdownMenuItem>
          ) : null}
          {extraActions?.map((a) => (
            <DropdownMenuItem
              key={a.key}
              onSelect={a.onSelect}
              destructive={a.destructive}
              disabled={a.disabled}
            >
              {a.icon}
              {a.label}
            </DropdownMenuItem>
          ))}
          {onDelete ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onDelete} destructive>
                <Trash2 />
                {deleteLabel}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
