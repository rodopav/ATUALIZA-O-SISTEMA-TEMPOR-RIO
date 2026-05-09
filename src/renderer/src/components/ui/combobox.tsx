import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Input } from './input'
import { cn } from '../../lib/cn'

export interface ComboboxOption {
  value: string
  label: string
  hint?: string
}

interface ComboboxProps {
  value: string | null
  onChange: (next: string | null) => void
  options: ComboboxOption[]
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  disabled?: boolean
  onCreateNew?: () => void
  createNewLabel?: string
  className?: string
  id?: string
}

const VIRTUALIZE_THRESHOLD = 50

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Selecionar...',
  emptyMessage = 'Nenhum resultado encontrado.',
  searchPlaceholder = 'Buscar...',
  disabled,
  onCreateNew,
  createNewLabel = '+ Cadastrar novo',
  className,
  id,
}: ComboboxProps): React.ReactElement {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [activeIdx, setActiveIdx] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.hint?.toLowerCase().includes(q) ?? false),
    )
  }, [options, search])

  const totalItems = filtered.length + (onCreateNew ? 1 : 0)
  const shouldVirtualize = filtered.length > VIRTUALIZE_THRESHOLD

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 36,
    overscan: 6,
  })

  const selected = options.find((o) => o.value === value)

  React.useEffect(() => {
    if (!open) {
      setSearch('')
      setActiveIdx(0)
    }
  }, [open])

  React.useEffect(() => {
    setActiveIdx(0)
  }, [search])

  const handleSelect = (opt: ComboboxOption): void => {
    onChange(opt.value)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, totalItems - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx < filtered.length) {
        const opt = filtered[activeIdx]
        if (opt) handleSelect(opt)
      } else if (onCreateNew) {
        setOpen(false)
        onCreateNew()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>
        <div ref={listRef} className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 && !onCreateNew ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : null}
          {shouldVirtualize ? (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((vi) => {
                const opt = filtered[vi.index]
                if (!opt) return null
                return (
                  <ComboItem
                    key={opt.value}
                    option={opt}
                    selected={opt.value === value}
                    active={vi.index === activeIdx}
                    onSelect={handleSelect}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${vi.start}px)`,
                    }}
                  />
                )
              })}
            </div>
          ) : (
            filtered.map((opt, idx) => (
              <ComboItem
                key={opt.value}
                option={opt}
                selected={opt.value === value}
                active={idx === activeIdx}
                onSelect={handleSelect}
              />
            ))
          )}
          {onCreateNew ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onCreateNew()
              }}
              className={cn(
                'mt-1 flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm font-medium',
                'border-t border-border/60 pt-2',
                'hover:bg-accent hover:text-accent-foreground',
                activeIdx === filtered.length && 'bg-accent text-accent-foreground',
              )}
            >
              <Plus className="h-4 w-4" />
              {createNewLabel}
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ComboItemProps {
  option: ComboboxOption
  selected: boolean
  active: boolean
  onSelect: (opt: ComboboxOption) => void
  style?: React.CSSProperties
}

function ComboItem({
  option,
  selected,
  active,
  onSelect,
  style,
}: ComboItemProps): React.ReactElement {
  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(option)}
      style={style}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
        'hover:bg-accent hover:text-accent-foreground',
        active && 'bg-accent text-accent-foreground',
      )}
    >
      <Check className={cn('h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
      <span className="flex-1 truncate">{option.label}</span>
      {option.hint ? (
        <span className="text-xs text-muted-foreground">{option.hint}</span>
      ) : null}
    </div>
  )
}
