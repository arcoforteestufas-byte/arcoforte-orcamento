"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  excluirEtapa, excluirFunil, excluirItemLista, obterConfigCrm, reordenarEtapas,
  salvarConfigCrm, salvarEtapa, salvarFunil, salvarItemLista,
} from "@/app/actions/crm"
import type { CrmConfig, CrmEtapa, CrmFunil, CrmItemLista } from "@/lib/crm-types"

const inp = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"

type Dados = Awaited<ReturnType<typeof obterConfigCrm>>

export function CrmConfigManager() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [funilSel, setFunilSel] = useState("")
  const [config, setConfig] = useState<CrmConfig | null>(null)

  const carregar = useCallback(async () => {
    const d = await obterConfigCrm()
    setDados(d)
    setConfig(d.config)
    setFunilSel(atual => atual && d.funis.some(f => f.id === atual) ? atual : d.funis[0]?.id || "")
  }, [])

  useEffect(() => { carregar() }, [carregar])

  if (!dados || !config) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (dados.erro) {
    return (
      <Card className="border-amber-300 bg-amber-50">
        <CardContent className="pt-6 text-amber-900 text-sm">
          As tabelas do CRM ainda não existem neste banco. Rode a migração <b>supabase/migrations/20261113000000_crm.sql</b> no SQL Editor do Supabase.
          <div className="mt-1 text-xs opacity-70">{dados.erro}</div>
        </CardContent>
      </Card>
    )
  }

  const funil = dados.funis.find(f => f.id === funilSel)
  const etapas = dados.etapas.filter(e => e.funil_id === funilSel).sort((a, b) => a.ordem - b.ordem)

  const res = async (p: Promise<{ ok: boolean; erro?: string }>, msg?: string) => {
    const r = await p
    if (!r.ok) { toast.error(r.erro); return false }
    if (msg) toast.success(msg)
    await carregar()
    return true
  }

  const mover = async (idx: number, dir: -1 | 1) => {
    const ids = etapas.map(e => e.id)
    const j = idx + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    await res(reordenarEtapas(ids))
  }

  return (
    <div className="space-y-6">
      {/* ---------------- Permissões ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Quem vê o quê</CardTitle>
          <CardDescription>Administradores sempre veem e editam todos os leads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[#d97021]" checked={config.vendedor_ve_todos}
              onChange={e => setConfig({ ...config, vendedor_ve_todos: e.target.checked, vendedor_edita_todos: e.target.checked && config.vendedor_edita_todos })} />
            Vendedores veem os leads de todos os vendedores
          </label>
          <label className={`flex items-center gap-2 pl-6 ${config.vendedor_ve_todos ? "" : "opacity-40"}`}>
            <input type="checkbox" className="h-4 w-4 accent-[#d97021]" disabled={!config.vendedor_ve_todos} checked={config.vendedor_edita_todos}
              onChange={e => setConfig({ ...config, vendedor_edita_todos: e.target.checked })} />
            …e também podem mover e editar os leads dos outros
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[#d97021]" checked={config.motivo_perda_obrigatorio}
              onChange={e => setConfig({ ...config, motivo_perda_obrigatorio: e.target.checked })} />
            Motivo da perda é obrigatório
          </label>
          <div className="flex items-center gap-2">
            Alertar cartão parado depois de
            <input className={`${inp} w-20`} type="number" min={1} value={config.dias_alerta_parado}
              onChange={e => setConfig({ ...config, dias_alerta_parado: Number(e.target.value) })} />
            dias na mesma etapa
          </div>
          <Button className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={() => res(salvarConfigCrm(config), "Configuração salva")}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </CardContent>
      </Card>

      {/* ---------------- Funis e etapas ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Funis e etapas</CardTitle>
          <CardDescription>
            Cada funil tem suas colunas. Tipo <b>Ganho</b> pede o orçamento fechado; tipo <b>Perdido</b> pede o motivo.
            A probabilidade é usada na previsão de faturamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <Label>Funil</Label>
              <select className={`${inp} w-64`} value={funilSel} onChange={e => setFunilSel(e.target.value)}>
                {dados.funis.map(f => <option key={f.id} value={f.id}>{f.nome}{f.ativo ? "" : " (desativado)"}</option>)}
              </select>
            </div>
            <Button variant="outline" className="gap-1" onClick={async () => {
              const nome = prompt("Nome do novo funil:")
              if (!nome) return
              const r = await salvarFunil({ nome, ordem: dados.funis.length })
              if (!r.ok) return toast.error(r.erro)
              toast.success("Funil criado")
              setFunilSel(r.dados!.id)
              carregar()
            }}><Plus className="h-4 w-4" /> Novo funil</Button>
          </div>

          {funil && <FunilEditor key={funil.id} funil={funil} onSalvar={f => res(salvarFunil(f), "Funil salvo")}
            onExcluir={async () => { if (confirm(`Excluir o funil "${funil.nome}"?`)) await res(excluirFunil(funil.id), "Funil excluído") }} />}

          <div className="rounded-md border divide-y">
            <div className="grid grid-cols-[auto_1fr_130px_90px_70px_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span className="w-14">Ordem</span><span>Etapa</span><span>Tipo</span><span>Chance %</span><span>Cor</span><span className="w-20" />
            </div>
            {etapas.map((e, i) => (
              <EtapaLinha key={e.id} etapa={e} uso={dados.usoEtapa[e.id] || 0}
                primeira={i === 0} ultima={i === etapas.length - 1}
                onSubir={() => mover(i, -1)} onDescer={() => mover(i, 1)}
                onSalvar={et => res(salvarEtapa(et), "Etapa salva")}
                onExcluir={async () => {
                  const uso = dados.usoEtapa[e.id] || 0
                  let destino: string | undefined
                  if (uso) {
                    const outras = etapas.filter(x => x.id !== e.id && x.tipo === "aberta")
                    const escolha = prompt(`Esta etapa tem ${uso} lead(s). Digite o número da etapa para onde movê-los:\n` +
                      outras.map((x, k) => `${k + 1} - ${x.nome}`).join("\n"))
                    if (!escolha) return
                    destino = outras[Number(escolha) - 1]?.id
                    if (!destino) return toast.error("Número inválido")
                  } else if (!confirm(`Excluir a etapa "${e.nome}"?`)) return
                  await res(excluirEtapa(e.id, destino), "Etapa excluída")
                }}
              />
            ))}
          </div>
          {funil && (
            <Button variant="outline" className="gap-1" onClick={() =>
              res(salvarEtapa({ funil_id: funil.id, nome: "Nova etapa", ordem: etapas.length, tipo: "aberta", cor: "#64748b", probabilidade: 20 }), "Etapa criada")
            }><Plus className="h-4 w-4" /> Adicionar etapa</Button>
          )}
        </CardContent>
      </Card>

      {/* ---------------- Listas ---------------- */}
      <div className="grid md:grid-cols-2 gap-6">
        <ListaEditor titulo="Motivos de perda" itens={dados.motivos}
          onSalvar={it => res(salvarItemLista("crm_motivos_perda", it))}
          onExcluir={id => res(excluirItemLista("crm_motivos_perda", id))} />
        <ListaEditor titulo="Origens do lead" itens={dados.origens}
          onSalvar={it => res(salvarItemLista("crm_origens", it))}
          onExcluir={id => res(excluirItemLista("crm_origens", id))} />
      </div>
    </div>
  )
}

function FunilEditor({ funil, onSalvar, onExcluir }: {
  funil: CrmFunil
  onSalvar: (f: CrmFunil) => void
  onExcluir: () => void
}) {
  const [f, setF] = useState(funil)
  const mudou = f.nome !== funil.nome || f.ativo !== funil.ativo
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-3">
      <input className={`${inp} w-64 bg-background`} value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} />
      <label className="flex items-center gap-1.5 text-sm">
        <input type="checkbox" className="accent-[#d97021]" checked={f.ativo} onChange={e => setF({ ...f, ativo: e.target.checked })} /> Ativo
      </label>
      <Button size="sm" disabled={!mudou} onClick={() => onSalvar(f)}>Salvar funil</Button>
      <Button size="sm" variant="ghost" className="text-red-600" onClick={onExcluir}><Trash2 className="h-4 w-4" /></Button>
    </div>
  )
}

function EtapaLinha({ etapa, uso, primeira, ultima, onSubir, onDescer, onSalvar, onExcluir }: {
  etapa: CrmEtapa
  uso: number
  primeira: boolean
  ultima: boolean
  onSubir: () => void
  onDescer: () => void
  onSalvar: (e: CrmEtapa) => void
  onExcluir: () => void
}) {
  const [e, setE] = useState(etapa)
  useEffect(() => setE(etapa), [etapa])
  const mudou = JSON.stringify(e) !== JSON.stringify(etapa)
  return (
    <div className="grid grid-cols-[auto_1fr_130px_90px_70px_auto] gap-2 items-center px-3 py-2">
      <div className="flex w-14">
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={primeira} onClick={onSubir}><ArrowUp className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={ultima} onClick={onDescer}><ArrowDown className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="flex items-center gap-2">
        <input className={inp} value={e.nome} onChange={x => setE({ ...e, nome: x.target.value })} />
        {uso > 0 && <span className="text-xs text-muted-foreground whitespace-nowrap">{uso} lead(s)</span>}
      </div>
      <select className={inp} value={e.tipo} onChange={x => setE({ ...e, tipo: x.target.value as CrmEtapa["tipo"] })}>
        <option value="aberta">Em andamento</option>
        <option value="ganho">Ganho</option>
        <option value="perdido">Perdido</option>
      </select>
      <input className={inp} type="number" min={0} max={100} value={e.probabilidade} onChange={x => setE({ ...e, probabilidade: Number(x.target.value) })} />
      <input type="color" className="h-9 w-full cursor-pointer rounded border" value={e.cor} onChange={x => setE({ ...e, cor: x.target.value })} />
      <div className="flex w-20 justify-end">
        <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!mudou} onClick={() => onSalvar(e)} title="Salvar"><Save className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={onExcluir} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

function ListaEditor({ titulo, itens, onSalvar, onExcluir }: {
  titulo: string
  itens: CrmItemLista[]
  onSalvar: (it: Partial<CrmItemLista> & { nome: string }) => Promise<boolean>
  onExcluir: (id: string) => void
}) {
  const [novo, setNovo] = useState("")
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{titulo}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {itens.map(it => (
          <ItemLinha key={it.id} item={it} onSalvar={onSalvar} onExcluir={() => { if (confirm(`Excluir "${it.nome}"?`)) onExcluir(it.id) }} />
        ))}
        <div className="flex gap-2 pt-2">
          <input className={inp} value={novo} placeholder="Novo item" onChange={e => setNovo(e.target.value)} />
          <Button variant="outline" disabled={!novo.trim()} onClick={async () => {
            if (await onSalvar({ nome: novo, ordem: itens.length })) setNovo("")
          }}><Plus className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ItemLinha({ item, onSalvar, onExcluir }: {
  item: CrmItemLista
  onSalvar: (it: Partial<CrmItemLista> & { nome: string }) => Promise<boolean>
  onExcluir: () => void
}) {
  const [nome, setNome] = useState(item.nome)
  const [ativo, setAtivo] = useState(item.ativo)
  const mudou = nome !== item.nome || ativo !== item.ativo
  return (
    <div className="flex items-center gap-2">
      <input className={inp} value={nome} onChange={e => setNome(e.target.value)} />
      <label className="flex items-center gap-1 text-xs whitespace-nowrap">
        <input type="checkbox" className="accent-[#d97021]" checked={ativo} onChange={e => setAtivo(e.target.checked)} /> ativo
      </label>
      <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!mudou} onClick={() => onSalvar({ id: item.id, nome, ativo, ordem: item.ordem })}><Save className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={onExcluir}><Trash2 className="h-4 w-4" /></Button>
    </div>
  )
}
