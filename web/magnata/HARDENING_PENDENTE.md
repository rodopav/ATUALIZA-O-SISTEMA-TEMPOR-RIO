# Hardening pendente — painel Supabase

Estes itens não dão pra resolver via SQL/MCP. Precisam ser tocados no
dashboard do Supabase (https://supabase.com/dashboard/project/rhhmdjipigvtfrzwzchh).

## 1. Leaked Password Protection (HaveIBeenPwned)

Caminho: **Authentication → Providers → Email → Password security**

Ativar o toggle "Enable HaveIBeenPwned password check". Quando o user
tentar criar senha que já apareceu em algum vazamento público, o
Supabase rejeita antes de gravar.

Sem isso, qualquer um pode usar `Password123!` ou similar mesmo que
esteja em todo wordlist do rockyou.

## 2. MFA TOTP

Caminho: **Authentication → Providers → Multi-factor authentication**

Ativar **TOTP** (Time-based One-Time Password). Pra cockpit financeiro
isso devia ser obrigatório, não opcional. Depois de ativar, marcar como
required pra perfis com `is_magnata=true` (a aplicação valida isso no
AuthGate em `src/App.tsx`).

## 3. CORS allowlist

Caminho: **Project Settings → API → CORS Configuration**

Hoje provavelmente está com `*` (wildcard). Restringir só a:

- `https://rodopav-magnata.vercel.app`
- `https://aprovacoes.rodopav` (se aplicável)
- `http://localhost:5174` (dev local)

Isso reduz o blast radius caso a anon key vaze: outros origins não
conseguem usar a key pra chamar a API.

## 4. Rate limiting do Auth

Caminho: **Authentication → Rate limits**

Verificar se está nos defaults agressivos (5 login attempts / minute por
IP, etc). Se estiver "Unlimited" em qualquer endpoint, baixar.

## 5. Verificar variáveis de ambiente Vercel

Garantir que as env vars `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
estão setadas no projeto Vercel `rodopav-magnata`:

```
vercel env ls --scope rodopav-sistema-s-projects
```

Com elas setadas, o `getConfig()` em `src/lib/config.ts` usa o build
direto e NÃO grava a anon key no localStorage do browser. Isso fecha o
vetor de roubo da chave via XSS / extensão maliciosa.

---

## Já resolvido (não precisa fazer nada)

- ✅ RLS habilitado nas 16 tabelas public com policies
- ✅ Helper `is_magnata_user()` SECURITY DEFINER pra centralizar role check
- ✅ Role check no início das 8 RPCs `magnata_*` (RAISE EXCEPTION 42501)
- ✅ `search_path` corrigido nas funções `set_updated_at`, `periodo_esta_fechado`, `enforce_data_razoavel`, `chat_protect_immutable`
- ✅ 7 views convertidas pra `security_invoker=true` (era SECURITY DEFINER, herda RLS do caller agora)
- ✅ `apagar_dados_teste` revogado do `anon`, mantido `authenticated` com check interno de `is_superadmin`
- ✅ Security headers em produção (CSP, X-Frame-Options DENY, HSTS 2 anos, Permissions-Policy bloqueando sensores, etc)
- ✅ Service Worker NetworkOnly pra Supabase REST/auth/realtime (não cacheia dado financeiro no device)
- ✅ Anon key prioriza env var sobre localStorage
- ✅ Mensagem de "acesso negado" não revela mais o nome do campo `is_magnata`

## Validação manual sugerida

Depois de ativar as 5 mudanças no painel, repetir:

```bash
# Teste 1: anon NÃO chama magnata_kpis_executivos
curl -X POST "https://rhhmdjipigvtfrzwzchh.supabase.co/rest/v1/rpc/magnata_kpis_executivos" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json"
# Esperado: 401 (não 200 com dado)

# Teste 2: user autenticado SEM is_magnata também NÃO chama
curl -X POST "https://rhhmdjipigvtfrzwzchh.supabase.co/rest/v1/rpc/magnata_kpis_executivos" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <JWT_USER_COMUM>" \
  -H "Content-Type: application/json"
# Esperado: 403 com code 42501 "forbidden: requires magnata role"

# Teste 3: PATCH em profiles tentando subir flag is_magnata
curl -X PATCH "https://rhhmdjipigvtfrzwzchh.supabase.co/rest/v1/profiles?id=eq.<SEU_ID>" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <JWT_VOCE>" \
  -H "Content-Type: application/json" \
  -d '{"is_magnata": true}'
# Esperado: 403 (WITH CHECK da policy profiles_update_safe_fields bloqueia)
```
