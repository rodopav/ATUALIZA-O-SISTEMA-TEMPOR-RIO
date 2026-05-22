# Apps Web Rodopav (PWA)

Dois Progressive Web Apps que rodam em qualquer celular/desktop via browser,
instaláveis na tela inicial. Hospedados na Vercel, conectados ao mesmo Supabase
(`rhhmdjipigvtfrzwzchh`) do app Electron.

```
web/
├── magnata/       → Cockpit executivo do CFO (read-only)
└── aprovacoes/    → Fila de aprovações pra responsável financeiro
```

## Stack

- **Vite 5 + React 19 + TypeScript strict**
- **Tailwind v3.4** (mesmo design do Electron — preto + âmbar)
- **Supabase JS v2** (auth + RPCs já existentes no banco)
- **TanStack Query 5** (cache + revalidação)
- **vite-plugin-pwa** (Service Worker + manifest)
- **Web Push API + VAPID** (só no Aprovações)

## Quem acessa o quê

| App        | Quem pode entrar                                | Funcionalidades                                              |
|------------|--------------------------------------------------|--------------------------------------------------------------|
| Magnata    | `is_magnata = true` OR `is_superadmin = true`    | Saldo grupo, KPIs, alertas, contas no vermelho, limites      |
| Aprovações | `role = 'admin_financeiro'` OR `is_superadmin`   | Pendentes, em ausência (cascade DELETE), histórico, push     |

RLS do Supabase já bloqueia acesso indevido — front só checka cedo pra dar mensagem clara.

---

## 🚀 Deploy na Vercel — Magnata

### 1. Criar projeto

1. **vercel.com** → New Project → Import Git Repository (`rodopav/ATUALIZA-O-SISTEMA-TEMPOR-RIO`)
2. **Root Directory**: `web/magnata`
3. **Framework**: Vite (detecta automaticamente do `vercel.json`)
4. **Build Command**: já configurado no `vercel.json` (`pnpm install && pnpm build`)

### 2. Environment Variables

Settings → Environment Variables → adiciona:

```
VITE_SUPABASE_URL=https://rhhmdjipigvtfrzwzchh.supabase.co
VITE_SUPABASE_ANON_KEY=<copiar do projeto Supabase → Settings → API → anon public>
```

Aplicar em **Production, Preview, Development**.

### 3. Deploy + domínio

- Após primeiro deploy, vai pra `<algum-nome>.vercel.app`.
- Em **Settings → Domains** pode renomear pra `rodopav-magnata.vercel.app`.

---

## 🚀 Deploy na Vercel — Aprovações

Igual ao Magnata, mas:
- **Root Directory**: `web/aprovacoes`
- **Domain sugerido**: `rodopav-aprovacoes.vercel.app`
- 3 env vars (a terceira é nova):

```
VITE_SUPABASE_URL=https://rhhmdjipigvtfrzwzchh.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_VAPID_PUBLIC_KEY=<gerar — ver seção Push abaixo>
```

Se `VITE_VAPID_PUBLIC_KEY` estiver vazia, o app funciona normalmente mas push fica desabilitado (sem erro).

---

## 🔔 Push notifications (só Aprovações)

Setup em 3 passos:

### 1. Gerar par VAPID

```bash
npx web-push generate-vapid-keys
# =======================================
# Public Key:  BFL...   ← vai pra Vercel env (VITE_VAPID_PUBLIC_KEY)
#                       ← vai pra Edge Function secret (VAPID_PUBLIC_KEY)
# Private Key: x9C...   ← SÓ pra Edge Function secret (VAPID_PRIVATE_KEY)
# =======================================
```

A pública é embutida no JS do frontend (não é segredo). A privada FICA SÓ na
Edge Function — não vai pro Vercel nem pro git.

### 2. Aplicar a migration

```bash
# Via supabase CLI (recomendado pra rastreio):
cd web/aprovacoes
supabase db push

# Ou via MCP execute_sql (one-shot):
# Cole o conteúdo de supabase/migrations/push_subscriptions.sql
```

Depois rode **uma vez** pra configurar os settings do banco (substituindo a anon-key):

```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://rhhmdjipigvtfrzwzchh.supabase.co';
ALTER DATABASE postgres SET app.anon_key = '<anon-key>';
SELECT pg_reload_conf();
```

### 3. Deploy da Edge Function

```bash
cd web/aprovacoes
supabase link --project-ref rhhmdjipigvtfrzwzchh
supabase functions deploy notify-approvers

# Configurar secrets:
supabase secrets set VAPID_PUBLIC_KEY="BFL..."
supabase secrets set VAPID_PRIVATE_KEY="x9C..."
supabase secrets set VAPID_SUBJECT="mailto:ti@rodopav.com.br"
```

Pronto. Quando alguém criar uma solicitação no app Electron, o trigger no banco chama
a Edge Function, que envia push pra todos os admins inscritos.

### Testar push localmente

1. Em `web/aprovacoes`, crie `.env.local` com a `VITE_VAPID_PUBLIC_KEY`.
2. `pnpm dev` → abre `localhost:5175` → entra → aceita o banner de notificação.
3. Cria uma solicitação no app Electron → push chega no celular/desktop dentro de 1-2s.

---

## 🛠 Desenvolvimento local

```bash
# Magnata
cd web/magnata
pnpm install
cp .env.example .env.local  # preencher SUPABASE_URL e ANON_KEY
pnpm dev   # localhost:5174

# Aprovações
cd web/aprovacoes
pnpm install
cp .env.example .env.local  # preencher tudo
pnpm dev   # localhost:5175
```

PWA install funciona em HTTPS — em dev você instala via Chrome DevTools → Application → Manifest.

---

## 📱 Instalação como app (PWA)

**Android (Chrome)**: abre a URL → menu (⋮) → "Add to Home screen" / "Instalar app".
**iOS (Safari)**: abre a URL → botão compartilhar → "Adicionar à Tela de Início".
**Desktop (Chrome/Edge)**: ícone de instalar na barra de endereço (à direita).

Depois de instalado roda em janela própria sem chrome do browser. Login persiste via localStorage.

---

## 🔒 Segurança

- **ANON_KEY no frontend é OK** — não é segredo. O que protege é RLS no banco.
- **Service role NUNCA vai pro frontend**. Só a Edge Function usa.
- **VAPID private NUNCA vai pro frontend**. Só Edge Function como secret.
- Login persiste em `localStorage` do navegador. PWA instalado = sandbox isolado.

---

## 📂 Estrutura dos apps

```
magnata/                   aprovacoes/
├── index.html             ├── index.html
├── package.json           ├── package.json
├── vite.config.ts         ├── vite.config.ts        (injectManifest pra SW custom)
├── vercel.json            ├── vercel.json
├── tailwind.config.ts     ├── tailwind.config.ts
├── public/                ├── public/
│   ├── favicon.svg        │   ├── favicon.svg
│   ├── icon-192.png       │   ├── icon-192.png
│   └── icon-512.png       │   └── icon-512.png
├── scripts/               ├── scripts/
│   └── gen-icons.mjs      │   └── gen-icons.mjs
└── src/                   ├── supabase/
    ├── main.tsx           │   ├── migrations/
    ├── App.tsx            │   │   └── push_subscriptions.sql
    ├── styles.css         │   └── functions/
    ├── lib/               │       └── notify-approvers/
    │   ├── supabase.ts    │           └── index.ts
    │   ├── auth-store.ts  └── src/
    │   ├── queries.ts         ├── main.tsx
    │   ├── format.ts          ├── App.tsx
    │   └── cn.ts              ├── sw.ts               (Service Worker custom)
    ├── components/             ├── styles.css
    │   ├── ui/                 ├── lib/
    │   ├── HeroExecutivo.tsx   │   ├── supabase.ts
    │   ├── KpisGrid.tsx        │   ├── auth-store.ts
    │   ├── KpiCard.tsx         │   ├── solicitacoes-queries.ts
    │   ├── AlertasBanner.tsx   │   ├── push.ts          (Web Push API)
    │   ├── SaldosCards.tsx     │   ├── format.ts
    │   ├── ContasNegativasList.tsx │   └── cn.ts
    │   └── LimitesPorContaList.tsx └── components/
    └── pages/                       ├── ui/
        ├── Login.tsx                ├── SolicitacaoCard.tsx
        └── Dashboard.tsx            ├── AprovarDialog.tsx
                                     ├── RejeitarDialog.tsx
                                     ├── RevisarAusenciaDialog.tsx
                                     └── PushBanner.tsx
                                  └── pages/
                                      ├── Login.tsx
                                      └── Dashboard.tsx
```

---

## 🔄 Auto-update

Configurado em ambos com `registerType: 'autoUpdate'` — quando você dá `git push`,
a Vercel rebuilda em ~1min e os PWAs já instalados pegam a nova versão na próxima
abertura (ou via prompt do SW se você customizar).

---

## ❓ Bug? Falta funcionalidade?

Compara com `app/src/renderer/src/pages/magnata/` e `app/src/renderer/src/pages/AdminSolicitacoes.tsx`
do Electron — esses PWAs replicam o subset essencial.
