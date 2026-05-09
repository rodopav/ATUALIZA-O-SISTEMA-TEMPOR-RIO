import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { supabase } from '../../lib/supabase'
import { mapError } from '../../lib/error-mapper'
import type { FornecedorCliente } from '../../lib/lancamentos-queries'

interface NewFornecedorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (fornecedor: FornecedorCliente) => void
}

interface FormState {
  nome: string
  tipo: 'PF' | 'PJ'
  documento: string
}

const INITIAL: FormState = { nome: '', tipo: 'PJ', documento: '' }

export function NewFornecedorDialog({
  open,
  onOpenChange,
  onCreated,
}: NewFornecedorDialogProps): React.ReactElement {
  const [form, setForm] = React.useState<FormState>(INITIAL)
  const [error, setError] = React.useState<string | null>(null)
  const qc = useQueryClient()

  React.useEffect(() => {
    if (!open) {
      setForm(INITIAL)
      setError(null)
    }
  }, [open])

  const mutation = useMutation({
    mutationFn: async (input: FormState): Promise<FornecedorCliente> => {
      const { data, error: insertErr } = await supabase
        .from('fornecedores_clientes')
        .insert({
          nome: input.nome.trim(),
          tipo: input.tipo,
          documento: input.documento.trim() || null,
        })
        .select('*')
        .single()
      if (insertErr) throw insertErr
      return data
    },
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['catalog', 'fornecedores'] })
      onCreated(created)
      onOpenChange(false)
    },
    onError: (err) => {
      setError(mapError(err).description)
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    setError(null)
    if (form.nome.trim().length < 2) {
      setError('Nome deve ter ao menos 2 caracteres.')
      return
    }
    mutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo fornecedor / cliente</DialogTitle>
          <DialogDescription>
            Cadastro rápido. Você poderá completar outros dados depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="forn-tipo">Tipo</Label>
            <Select
              value={form.tipo}
              onValueChange={(v) => setForm((s) => ({ ...s, tipo: v as 'PF' | 'PJ' }))}
            >
              <SelectTrigger id="forn-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PF">Pessoa Física</SelectItem>
                <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="forn-doc">
              {form.tipo === 'PF' ? 'CPF' : 'CNPJ'} (opcional)
            </Label>
            <Input
              id="forn-doc"
              value={form.documento}
              onChange={(e) => setForm((s) => ({ ...s, documento: e.target.value }))}
              placeholder={form.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="forn-nome">Nome / Razão Social</Label>
            <Input
              id="forn-nome"
              value={form.nome}
              onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
              autoFocus
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : null}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
