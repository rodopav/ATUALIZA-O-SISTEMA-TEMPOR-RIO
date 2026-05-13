import {
  LayoutDashboard,
  Wallet,
  ListChecks,
  Users,
  Building2,
  Tag,
  PieChart,
  CheckCircle2,
  Landmark,
  FolderTree,
  ArrowRightLeft,
  CalendarDays,
  Lock,
  ShieldCheck,
  BookCheck,
  KeyRound,
  Send,
  Inbox,
  CloudDownload,
  Trash2,
  MessageSquare,
} from 'lucide-react'
import type { NavItem } from './Sidebar'

export const USER_OPERATION_BASE: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    end: true,
    modulo: 'dashboard',
  },
  {
    to: '/dashboard/saldo-geral',
    label: 'Saldo geral',
    icon: Wallet,
    modulo: 'saldo_geral',
  },
  {
    to: '/dashboard/centros-de-custo',
    label: 'Centros de custo',
    icon: PieChart,
    modulo: 'centros_de_custo',
  },
  {
    to: '/dashboard/conferencia',
    label: 'Conferência',
    icon: CheckCircle2,
    modulo: 'conferencia',
  },
  {
    to: '/dashboard/conciliacao',
    label: 'Conciliação',
    icon: BookCheck,
    modulo: 'conciliacao',
  },
  {
    to: '/solicitacoes',
    label: 'Solicitações',
    icon: Send,
    modulo: 'solicitacoes',
  },
]

// Mantido para compat; vazio agora — Conciliação foi promovida pra BASE
// e o filtro por módulo já controla visibilidade.
export const USER_OPERATION_ADMIN_EXTRA: NavItem[] = []

export const USER_CADASTROS_NAV: NavItem[] = [
  {
    to: '/lancamentos',
    label: 'Lançamentos',
    icon: ListChecks,
    modulo: 'lancamentos',
  },
  {
    to: '/fornecedores',
    label: 'Fornecedores',
    icon: Tag,
    modulo: 'fornecedores',
  },
]

export const USER_ADMIN_NAV: NavItem[] = [
  {
    to: '/admin/empresas',
    label: 'Empresas',
    icon: Building2,
    modulo: 'empresas',
  },
  {
    to: '/admin/contas',
    label: 'Contas bancárias',
    icon: Landmark,
    modulo: 'contas',
  },
  {
    to: '/admin/centros-de-custo',
    label: 'Centros de custo',
    icon: FolderTree,
    modulo: 'centros_admin',
  },
  {
    to: '/admin/tipos-operacao',
    label: 'Tipos de operação',
    icon: ArrowRightLeft,
    modulo: 'tipos_operacao',
  },
  {
    to: '/admin/saldos-iniciais',
    label: 'Saldos iniciais',
    icon: CalendarDays,
    modulo: 'saldos_iniciais',
  },
  {
    to: '/admin/periodos',
    label: 'Períodos',
    icon: Lock,
    modulo: 'periodos',
  },
  {
    to: '/admin/permissoes',
    label: 'Permissões',
    icon: KeyRound,
    modulo: 'permissoes',
  },
  {
    to: '/admin/solicitacoes',
    label: 'Aprovar solicitações',
    icon: Inbox,
    modulo: 'solicitacoes_aprovar',
  },
  {
    to: '/admin/auditoria',
    label: 'Auditoria',
    icon: ShieldCheck,
    modulo: 'auditoria',
  },
]

export const IAM_NAV: NavItem[] = [
  { to: '/iam/usuarios', label: 'Usuários', icon: Users, end: true },
  { to: '/iam/limpeza', label: 'Limpeza de dados', icon: Trash2 },
]

export const ATUALIZACOES_NAV: NavItem = {
  to: '/atualizacoes',
  label: 'Atualizações',
  icon: CloudDownload,
}

export const CHAT_NAV: NavItem = {
  to: '/chat',
  label: 'Chat',
  icon: MessageSquare,
}
