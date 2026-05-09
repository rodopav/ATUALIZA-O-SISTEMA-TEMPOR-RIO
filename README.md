# Sistema Financeiro Rodopav (Desktop)

Aplicativo Electron que substitui a planilha de tesouraria. Conecta a um Supabase já provisionado em São Paulo (`rhhmdjipigvtfrzwzchh`).

## Stack

- Electron 33 + electron-vite + electron-builder
- React 19 + react-router v7 + TypeScript 5.6 estrito
- Tailwind v4 + componentes shadcn/ui
- Supabase JS v2 + TanStack Query/Table
- Zustand · Zod · react-hook-form · date-fns (pt-BR) · dinero.js

## Pré-requisitos

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)

## Setup

```bash
pnpm install
pnpm dev
```

A primeira execução abre uma janela com a tela de login. O usuário precisa existir em **Supabase Auth → Users** e ter um row em `profiles`.

Para promover alguém a admin (no SQL Editor do Supabase Dashboard):

```sql
UPDATE profiles SET role = 'admin_financeiro' WHERE email = 'voce@rodopav.com.br';
```

## Scripts

| comando | descrição |
|---|---|
| `pnpm dev` | desenvolvimento com HMR |
| `pnpm typecheck` | verifica os 2 tsconfig (node + web) |
| `pnpm lint` / `pnpm format` | ESLint + Prettier |
| `pnpm build` | bundle de produção em `out/` |
| `pnpm build:win` | gera instalador `.exe` em `release/` |
| `pnpm build:mac` | gera `.dmg` (rodar em macOS) |
| `pnpm build:linux` | gera `.AppImage` + `.deb` |
| `pnpm gen:types` | regenera `src/shared/database.types.ts` |
| `pnpm import:excel` | script de migração da planilha |

## Estrutura

```
src/
├── main/        Processo Node (janela, menu, IPC, auto-update)
├── preload/     Ponte segura main↔renderer (contextBridge)
├── renderer/    SPA React (Vite)
└── shared/      Tipos compartilhados (database, IPC, domínio)
```
