import * as React from 'react'
import { cn } from '../../lib/cn'

type JsonRecord = Record<string, unknown>

interface JsonDiffProps {
  before: unknown
  after: unknown
}

interface DiffEntry {
  /** Effect on a side. `same` keys are not highlighted. */
  status: 'added' | 'removed' | 'changed' | 'same' | 'absent'
}

interface SideMeta {
  keys: string[]
  diff: Record<string, DiffEntry>
  obj: JsonRecord | null
}

function isPlainObject(value: unknown): value is JsonRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

function valueToJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return false
  if (typeof a !== typeof b) return false
  if (typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return false
}

/**
 * Computes per-key diff metadata for two JSON objects (object-shaped, top-level
 * only). Non-object values short-circuit to a single synthetic key `value`.
 */
export function computeDiff(
  before: unknown,
  after: unknown,
): { left: SideMeta; right: SideMeta } {
  const beforeObj = isPlainObject(before) ? before : null
  const afterObj = isPlainObject(after) ? after : null

  // If neither side is an object, treat as a single synthetic field.
  if (!beforeObj && !afterObj) {
    const same = shallowEqual(before, after)
    const stub = (val: unknown): SideMeta => ({
      keys: ['value'],
      diff: { value: { status: same ? 'same' : 'changed' } },
      obj: { value: val },
    })
    return { left: stub(before), right: stub(after) }
  }

  const allKeys = new Set<string>()
  if (beforeObj) Object.keys(beforeObj).forEach((k) => allKeys.add(k))
  if (afterObj) Object.keys(afterObj).forEach((k) => allKeys.add(k))
  const orderedKeys = Array.from(allKeys).sort()

  const leftDiff: Record<string, DiffEntry> = {}
  const rightDiff: Record<string, DiffEntry> = {}
  const leftKeys: string[] = []
  const rightKeys: string[] = []

  for (const key of orderedKeys) {
    const inLeft = beforeObj !== null && key in beforeObj
    const inRight = afterObj !== null && key in afterObj
    const lv = beforeObj ? beforeObj[key] : undefined
    const rv = afterObj ? afterObj[key] : undefined

    if (inLeft && inRight) {
      const same = shallowEqual(lv, rv)
      leftDiff[key] = { status: same ? 'same' : 'changed' }
      rightDiff[key] = { status: same ? 'same' : 'changed' }
      leftKeys.push(key)
      rightKeys.push(key)
    } else if (inLeft) {
      leftDiff[key] = { status: 'removed' }
      rightDiff[key] = { status: 'absent' }
      leftKeys.push(key)
    } else if (inRight) {
      leftDiff[key] = { status: 'absent' }
      rightDiff[key] = { status: 'added' }
      rightKeys.push(key)
    }
  }

  return {
    left: { keys: leftKeys, diff: leftDiff, obj: beforeObj },
    right: { keys: rightKeys, diff: rightDiff, obj: afterObj },
  }
}

interface PanelProps {
  title: string
  side: SideMeta
  emptyLabel: string
}

function lineClass(status: DiffEntry['status']): string {
  switch (status) {
    case 'changed':
      return 'bg-amb-100 text-amb-600 dark:bg-amb-400/15 dark:text-amb-300'
    case 'added':
      return 'bg-grn-50 text-grn-600 dark:bg-grn-600/15'
    case 'removed':
      return 'bg-red-50 text-red-600 dark:bg-red-600/15'
    default:
      return ''
  }
}

function Panel({ title, side, emptyLabel }: PanelProps): React.ReactElement {
  if (!side.obj) {
    return (
      <div className="flex h-full flex-col rounded-md border bg-muted/30">
        <div className="border-b bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-md border bg-muted/10">
      <div className="border-b bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <pre className="m-0 max-h-[420px] overflow-auto p-0 font-mono text-xs leading-relaxed">
        <code className="block px-3 py-2">
          <span className="block">{'{'}</span>
          {side.keys.map((key, idx) => {
            const status = side.diff[key]?.status ?? 'same'
            const value = side.obj?.[key]
            const json = valueToJson(value)
            const isLast = idx === side.keys.length - 1
            return (
              <span
                key={key}
                className={cn(
                  'block whitespace-pre px-3 -mx-3',
                  lineClass(status),
                )}
              >
                {`  ${JSON.stringify(key)}: ${json}${isLast ? '' : ','}`}
              </span>
            )
          })}
          <span className="block">{'}'}</span>
        </code>
      </pre>
    </div>
  )
}

export function JsonDiff({
  before,
  after,
}: JsonDiffProps): React.ReactElement {
  const { left, right } = React.useMemo(
    () => computeDiff(before, after),
    [before, after],
  )

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Antes" side={left} emptyLabel="Sem valores anteriores." />
      <Panel
        title="Depois"
        side={right}
        emptyLabel="Sem valores posteriores."
      />
    </div>
  )
}
