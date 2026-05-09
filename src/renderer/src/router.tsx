import {
  createHashRouter,
  Navigate,
  type RouteObject,
} from 'react-router-dom'
import { Layout } from './components/Layout'
import { MagnataLayout } from './components/MagnataLayout'
import { LoginPage } from './pages/Login'
import { RedefinirSenhaPage } from './pages/RedefinirSenha'
import { DashboardPage } from './pages/Dashboard'
import { SaldoGeralPage } from './pages/SaldoGeral'
import CentrosCustoPage from './pages/CentrosCusto'
import ConferenciaPage from './pages/Conferencia'
import { LancamentosPage } from './pages/Lancamentos'
import { LancamentoFormPage } from './pages/LancamentoForm'
import { FornecedoresPage } from './pages/Fornecedores'
import { AdminUsuariosPage } from './pages/AdminUsuarios'
import { AdminEmpresasPage } from './pages/AdminEmpresas'
import { AdminContasPage } from './pages/AdminContas'
import { AdminCentrosPage } from './pages/AdminCentros'
import { AdminTiposPage } from './pages/AdminTipos'
import { AdminSaldosIniciaisPage } from './pages/AdminSaldosIniciais'
import { AdminPeriodosPage } from './pages/AdminPeriodos'
import AdminAuditoriaPage from './pages/AdminAuditoria'
import AdminPermissoesPage from './pages/AdminPermissoes'
import ConciliacaoPage from './pages/Conciliacao'
import { SolicitacoesPage } from './pages/Solicitacoes'
import { AdminSolicitacoesPage } from './pages/AdminSolicitacoes'
import { NotFoundPage } from './pages/NotFound'
import { AccessDeniedPage } from './pages/AccessDenied'
import AtualizacoesPage from './pages/Atualizacoes'
import AdminLimpezaPage from './pages/AdminLimpeza'
import MagnataVisaoPage from './pages/magnata/Visao'
import MagnataLiquidezPage from './pages/magnata/Liquidez'
import MagnataFluxoPage from './pages/magnata/Fluxo'
import MagnataEmpresasPage from './pages/magnata/Empresas'
import MagnataCentrosCustoPage from './pages/magnata/CentrosCusto'
import MagnataSaudePage from './pages/magnata/SaudeOperacional'
import MagnataTendenciasPage from './pages/magnata/Tendencias'
import MagnataLancamentosPage from './pages/magnata/Lancamentos'
import {
  APP_MODE,
  publicOnly,
  requireAdmin,
  requireAuth,
  requireMagnata,
  requireModulo,
  requireSuperadmin,
} from './router-loaders'

const userChildren: RouteObject[] = [
  {
    path: '/dashboard',
    loader: requireAuth,
    children: [
      {
        index: true,
        loader: requireModulo('dashboard'),
        element: <DashboardPage />,
      },
      {
        path: 'saldo-geral',
        loader: requireModulo('saldo_geral'),
        element: <SaldoGeralPage />,
      },
      {
        path: 'centros-de-custo',
        loader: requireModulo('centros_de_custo'),
        element: <CentrosCustoPage />,
      },
      {
        path: 'conferencia',
        loader: requireModulo('conferencia'),
        element: <ConferenciaPage />,
      },
      {
        path: 'conciliacao',
        loader: requireModulo('conciliacao'),
        element: <ConciliacaoPage />,
      },
    ],
  },
  {
    path: '/lancamentos',
    loader: requireAuth,
    children: [
      {
        index: true,
        loader: requireModulo('lancamentos'),
        element: <LancamentosPage />,
      },
      {
        path: 'novo',
        loader: requireModulo('lancamentos'),
        element: <LancamentoFormPage />,
      },
      {
        path: ':id',
        loader: requireModulo('lancamentos'),
        element: <LancamentoFormPage />,
      },
    ],
  },
  {
    path: '/fornecedores',
    loader: requireModulo('fornecedores'),
    element: <FornecedoresPage />,
  },
  {
    path: '/solicitacoes',
    loader: requireModulo('solicitacoes'),
    element: <SolicitacoesPage />,
  },
  {
    path: '/atualizacoes',
    loader: requireAuth,
    element: <AtualizacoesPage />,
  },
  {
    path: '/admin',
    loader: requireAdmin,
    children: [
      { index: true, element: <Navigate to="/admin/empresas" replace /> },
      {
        path: 'empresas',
        loader: requireModulo('empresas'),
        element: <AdminEmpresasPage />,
      },
      {
        path: 'contas',
        loader: requireModulo('contas'),
        element: <AdminContasPage />,
      },
      {
        path: 'centros-de-custo',
        loader: requireModulo('centros_admin'),
        element: <AdminCentrosPage />,
      },
      {
        path: 'tipos-operacao',
        loader: requireModulo('tipos_operacao'),
        element: <AdminTiposPage />,
      },
      {
        path: 'saldos-iniciais',
        loader: requireModulo('saldos_iniciais'),
        element: <AdminSaldosIniciaisPage />,
      },
      {
        path: 'periodos',
        loader: requireModulo('periodos'),
        element: <AdminPeriodosPage />,
      },
      {
        path: 'permissoes',
        loader: requireModulo('permissoes'),
        element: <AdminPermissoesPage />,
      },
      {
        path: 'solicitacoes',
        loader: requireModulo('solicitacoes_aprovar'),
        element: <AdminSolicitacoesPage />,
      },
      {
        path: 'auditoria',
        loader: requireModulo('auditoria'),
        element: <AdminAuditoriaPage />,
      },
    ],
  },
]

const adminChildren: RouteObject[] = [
  {
    path: '/iam',
    loader: requireSuperadmin,
    children: [
      { index: true, element: <Navigate to="/iam/usuarios" replace /> },
      { path: 'usuarios', element: <AdminUsuariosPage /> },
      { path: 'limpeza', element: <AdminLimpezaPage /> },
    ],
  },
  {
    path: '/atualizacoes',
    loader: requireAuth,
    element: <AtualizacoesPage />,
  },
]

const magnataChildren: RouteObject[] = [
  {
    path: '/magnata',
    loader: requireMagnata,
    children: [
      { index: true, element: <MagnataVisaoPage /> },
      { path: 'liquidez', element: <MagnataLiquidezPage /> },
      { path: 'fluxo', element: <MagnataFluxoPage /> },
      { path: 'empresas', element: <MagnataEmpresasPage /> },
      { path: 'centros-custo', element: <MagnataCentrosCustoPage /> },
      { path: 'saude', element: <MagnataSaudePage /> },
      { path: 'tendencias', element: <MagnataTendenciasPage /> },
      { path: 'lancamentos', element: <MagnataLancamentosPage /> },
    ],
  },
  {
    path: '/atualizacoes',
    loader: requireAuth,
    element: <AtualizacoesPage />,
  },
]

const homeRedirect =
  APP_MODE === 'admin'
    ? '/iam/usuarios'
    : APP_MODE === 'magnata'
      ? '/magnata'
      : '/dashboard'

const protectedLayout =
  APP_MODE === 'magnata' ? <MagnataLayout /> : <Layout />

const protectedChildren: RouteObject[] =
  APP_MODE === 'admin'
    ? adminChildren
    : APP_MODE === 'magnata'
      ? magnataChildren
      : userChildren

export const router = createHashRouter([
  { path: '/', element: <Navigate to={homeRedirect} replace /> },
  { path: '/login', element: <LoginPage />, loader: publicOnly },
  { path: '/redefinir-senha', element: <RedefinirSenhaPage /> },
  { path: '/acesso-negado', element: <AccessDeniedPage /> },
  {
    element: protectedLayout,
    loader: requireAuth,
    children: protectedChildren,
  },
  { path: '*', element: <NotFoundPage /> },
])
