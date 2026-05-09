import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Trash2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { useToast } from '../components/ui/use-toast'
import { supabase } from '../lib/supabase'
import { mapError } from '../lib/error-mapper'

interface ApagarResult {
  lancamentos_removidos: number
  solicitacoes_removidas: number
  saldos_iniciais_removidos: number
  periodos_removidos: number
  audit_log_removidos: number
}

const CONFIRM_PHRASE = 'APAGAR DADOS DE TESTE'

export function AdminLimpezaPage(): React.ReactElement {
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmText, setConfirmText] = React.useState('')
  const [lastResult, setLastResult] = React.useState<ApagarResult | null>(null)

  const mutation = useMutation({
    mutationFn: async (): Promise<ApagarResult> => {
      const { data, error } = await supabase.rpc('apagar_dados_teste')
      if (error) throw error
      const row = (data as ApagarResult[] | null)?.[0]
      if (!row) throw new Error('Resposta vazia da RPC.')
      return row
    },
    onSuccess: (result) => {
      setLastResult(result)
      setConfirmOpen(false)
      setConfirmText('')
      toast({
        title: 'Dados de teste apagados',
        description: `${result.lancamentos_removidos} lançamentos · ${result.solicitacoes_removidas} solicitações · ${result.saldos_iniciais_removidos} saldos iniciais · ${result.periodos_removidos} períodos · ${result.audit_log_removidos} logs.`,
        variant: 'success',
      })
    },
    onError: (err) => {
      const mapped = mapError(err)
      toast({
        title: 'Falha ao apagar',
        description: mapped.description,
        variant: 'destructive',
      })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Limpeza de Dados"
        description="Zera lançamentos, solicitações, saldos iniciais, períodos e auditoria. Empresas, contas e usuários são preservados."
      />

      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Operação irreversível</AlertTitle>
        <AlertDescription>
          Esta ação remove TODOS os lançamentos, solicitações e dados
          transacionais do sistema. Use apenas para resetar antes de subir
          dados reais. Não há rollback. Apenas superadmin pode executar.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>O que será apagado</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            A operação é atômica — ou tudo cai junto, ou nada cai.
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <DangerItem label="lancamentos" desc="Todos os lançamentos (entradas, saídas e transferências)" />
            <DangerItem label="solicitacoes_saldo" desc="Histórico de solicitações de saldo (pendentes, aprovadas, rejeitadas)" />
            <DangerItem label="saldos_iniciais" desc="Saldos iniciais cadastrados" />
            <DangerItem label="periodos_fechados" desc="Histórico de fechamentos de mês" />
            <DangerItem label="audit_log" desc="Log de auditoria" />
          </ul>
          <div className="mt-4 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3 w-3" />
            <strong>Preservados:</strong> empresas, contas bancárias, centros
            de custo, tipos de operação, fornecedores, usuários e permissões.
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="lg"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Apagar dados de teste
        </Button>
      </div>

      {lastResult ? (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Limpeza concluída</AlertTitle>
          <AlertDescription>
            <ul className="ml-2 mt-1 list-disc space-y-0.5">
              <li>{lastResult.lancamentos_removidos} lançamentos</li>
              <li>{lastResult.solicitacoes_removidas} solicitações de saldo</li>
              <li>{lastResult.saldos_iniciais_removidos} saldos iniciais</li>
              <li>{lastResult.periodos_removidos} períodos fechados</li>
              <li>{lastResult.audit_log_removidos} logs de auditoria</li>
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={(v) => !mutation.isPending && setConfirmOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar limpeza completa
            </DialogTitle>
            <DialogDescription>
              Para prosseguir, digite a frase abaixo exatamente como mostrada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
              {CONFIRM_PHRASE}
            </p>
            <div className="space-y-1">
              <Label htmlFor="confirm-input">Digite a frase:</Label>
              <Input
                id="confirm-input"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={CONFIRM_PHRASE}
                disabled={mutation.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => mutation.mutate()}
              disabled={confirmText !== CONFIRM_PHRASE || mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Apagar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DangerItem({
  label,
  desc,
}: {
  label: string
  desc: string
}): React.ReactElement {
  return (
    <li className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
      <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
      <div className="min-w-0">
        <code className="text-xs font-semibold text-destructive">{label}</code>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  )
}

export default AdminLimpezaPage
