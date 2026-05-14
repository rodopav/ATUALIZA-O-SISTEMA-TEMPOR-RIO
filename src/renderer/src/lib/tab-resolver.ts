// Resolve um pathname (ex. "/lancamentos/abc-123") em { label, iconName }
// que vai virar a aba no TabBar. Os ícones são Lucide e ficam mapeados
// por NOME (string) pra que a tab seja JSON-serializável no storage.

import {
  LayoutDashboard,
  Wallet,
  PieChart,
  CheckCircle2,
  BookCheck,
  Send,
  ListChecks,
  Tag,
  Building2,
  Landmark,
  FolderTree,
  ArrowRightLeft,
  CalendarDays,
  Lock,
  KeyRound,
  Inbox,
  ShieldCheck,
  CloudDownload,
  MessageSquare,
  Users,
  Trash2,
  FilePlus2,
  FilePen,
  Circle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Wallet,
  PieChart,
  CheckCircle2,
  BookCheck,
  Send,
  ListChecks,
  Tag,
  Building2,
  Landmark,
  FolderTree,
  ArrowRightLeft,
  CalendarDays,
  Lock,
  KeyRound,
  Inbox,
  ShieldCheck,
  CloudDownload,
  MessageSquare,
  Users,
  Trash2,
  FilePlus2,
  FilePen,
  Circle,
}

export function iconFromName(name: string): LucideIcon {
  return ICONS[name] ?? Circle
}

interface ResolvedTab {
  label: string
  iconName: string
}

interface TabPattern {
  match: (path: string) => boolean
  resolve: (path: string) => ResolvedTab
}

// Tabela path → label/icon. Statics primeiro (match exato), depois
// patterns dinâmicos.
const STATICS: Record<string, ResolvedTab> = {
  '/dashboard': { label: 'Dashboard', iconName: 'LayoutDashboard' },
  '/dashboard/saldo-geral': { label: 'Saldo geral', iconName: 'Wallet' },
  '/dashboard/centros-de-custo': {
    label: 'Centros de custo',
    iconName: 'PieChart',
  },
  '/dashboard/conferencia': {
    label: 'Conferência',
    iconName: 'CheckCircle2',
  },
  '/dashboard/conciliacao': { label: 'Conciliação', iconName: 'BookCheck' },
  '/solicitacoes': { label: 'Solicitações', iconName: 'Send' },
  '/lancamentos': { label: 'Lançamentos', iconName: 'ListChecks' },
  '/lancamentos/novo': { label: 'Novo lançamento', iconName: 'FilePlus2' },
  '/fornecedores': { label: 'Fornecedores', iconName: 'Tag' },
  '/chat': { label: 'Chat', iconName: 'MessageSquare' },
  '/atualizacoes': { label: 'Atualizações', iconName: 'CloudDownload' },
  '/admin/empresas': { label: 'Empresas', iconName: 'Building2' },
  '/admin/contas': { label: 'Contas bancárias', iconName: 'Landmark' },
  '/admin/centros-de-custo': {
    label: 'Centros de custo',
    iconName: 'FolderTree',
  },
  '/admin/tipos-operacao': {
    label: 'Tipos de operação',
    iconName: 'ArrowRightLeft',
  },
  '/admin/saldos-iniciais': {
    label: 'Saldos iniciais',
    iconName: 'CalendarDays',
  },
  '/admin/periodos': { label: 'Períodos', iconName: 'Lock' },
  '/admin/permissoes': { label: 'Permissões', iconName: 'KeyRound' },
  '/admin/solicitacoes': {
    label: 'Aprovar solicitações',
    iconName: 'Inbox',
  },
  '/admin/auditoria': { label: 'Auditoria', iconName: 'ShieldCheck' },
  '/iam/usuarios': { label: 'Usuários', iconName: 'Users' },
  '/iam/limpeza': { label: 'Limpeza', iconName: 'Trash2' },
}

const PATTERNS: TabPattern[] = [
  {
    // /lancamentos/<uuid>
    match: (p) => /^\/lancamentos\/[0-9a-f-]{6,}$/i.test(p),
    resolve: () => ({ label: 'Editar lançamento', iconName: 'FilePen' }),
  },
]

export function resolveTabForPath(path: string): ResolvedTab | null {
  // Rotas que NÃO devem virar aba (auth, telas modais etc.)
  if (path === '/' || path.startsWith('/login') || path.startsWith('/config'))
    return null

  if (STATICS[path]) return STATICS[path]
  for (const pat of PATTERNS) {
    if (pat.match(path)) return pat.resolve(path)
  }
  // Fallback: pega a última parte do path
  const last = path.split('/').filter(Boolean).pop() ?? path
  const label = last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ')
  return { label, iconName: 'Circle' }
}
