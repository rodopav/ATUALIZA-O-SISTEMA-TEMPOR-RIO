/**
 * Translates Postgres / Supabase errors into user-facing pt-BR messages.
 * Returns `{ title, description }` suitable for toast/alert components.
 */

export interface MappedError {
  title: string
  description: string
}

interface MaybePgError {
  code?: string | null
  message?: string | null
  details?: string | null
  hint?: string | null
  status?: number | null
  name?: string | null
}

const FALLBACK: MappedError = {
  title: 'Erro inesperado',
  description: 'Ocorreu um erro inesperado.',
}

function asPgError(err: unknown): MaybePgError | null {
  if (err && typeof err === 'object') return err as MaybePgError
  return null
}

export function mapError(err: unknown): MappedError {
  if (!err) return FALLBACK

  if (err instanceof Error && !asPgError(err)?.code) {
    return { title: 'Erro', description: err.message || FALLBACK.description }
  }

  const e = asPgError(err)
  if (!e) return FALLBACK

  const message = e.message ?? ''
  const code = e.code ?? ''

  // Period locked exception raised by trigger / RPC.
  if (
    message.includes('Período fechado') ||
    message.toLowerCase().includes('period locked') ||
    message.toLowerCase().includes('periodo fechado')
  ) {
    return {
      title: 'Período fechado',
      description: 'Período fechado. Apenas Admin Financeiro pode editar.',
    }
  }

  // P0001 — RAISE EXCEPTION ... USING ERRCODE = 'P0001'
  // Mensagens dos nossos triggers já vêm em pt-BR. Surface direto.
  if (code === 'P0001' && message) {
    return {
      title: 'Operação não permitida',
      description: message.replace(/^ERROR:\s*/, '').trim(),
    }
  }

  switch (code) {
    case '23514':
      return {
        title: 'Dados inválidos',
        description: 'Verifique os campos obrigatórios da operação.',
      }
    case '23505':
      return {
        title: 'Registro duplicado',
        description: 'Já existe um registro com estes dados.',
      }
    case '23503':
      return {
        title: 'Referência inválida',
        description: 'Referência inválida: o registro vinculado não existe.',
      }
    case '23502':
      return {
        title: 'Campo obrigatório',
        description: 'Preencha todos os campos obrigatórios.',
      }
    case '42501':
      return {
        title: 'Sem permissão',
        description: 'Sem permissão para esta ação.',
      }
    case 'PGRST301':
    case 'PGRST116':
      return {
        title: 'Sessão expirada',
        description: 'Sua sessão expirou. Faça login novamente.',
      }
    default:
      break
  }

  // Auth-specific
  if (e.status === 400 && /invalid login/i.test(message)) {
    return {
      title: 'Credenciais inválidas',
      description: 'E-mail ou senha incorretos.',
    }
  }
  if (e.status === 401 || e.status === 403) {
    return {
      title: 'Sem permissão',
      description: 'Sem permissão para esta ação.',
    }
  }

  if (message) {
    return { title: 'Erro', description: message }
  }

  return FALLBACK
}
