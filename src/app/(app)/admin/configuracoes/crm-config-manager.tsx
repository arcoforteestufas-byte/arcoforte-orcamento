"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowRight, ArrowUp, Flame, Pencil, Plus, Save, Snowflake, ThermometerSun, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  excluirCampo, excluirEtapa, excluirFunil, excluirItemLista, obterConfigCrm, reordenarCampos, reordenarEtapas,
  salvarCampo, salvarConfigCrm, salvarEtapa, salvarFunil, salvarItemLista,
} from "@/app/actions/crm"
import {
  TIPOS_CAMPO, pontosMaximos,
  type CrmCampo, type CrmConfig, type CrmEtapa, type CrmFunil, type CrmItemLista, type CrmOpcaoCampo,
} from "@/lib/crm-types"

const inp = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"

type Dados = Awaited<ReturnType<typeof obterConfigCrm>>
type Usuario = { id: string; nome: string }

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
        <CardContent className="pt-6 text-amber-900 text-sm">{dados.erro}</CardContent>
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
      {/* ---------------- Fluxo dos funis ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Funis</CardTitle>
          <CardDescription>
            Cada equipe trabalha no seu funil (ex.: Marketing → SDR → Vendedores). O lead passa de um funil para o outro com o botão
            &quot;Enviar para funil&quot; ou arrastando para a coluna &quot;Enviar&quot; no quadro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {dados.funis.map((f, i) => (
              <div key={f.id} className="flex items-center gap-2">
                <button onClick={() => setFunilSel(f.id)}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${f.id === funilSel ? "text-white shadow" : "bg-muted hover:bg-muted/70"} ${f.ativo ? "" : "opacity-50"}`}
                  style={f.id === funilSel ? { backgroundColor: f.cor } : undefined}>
                  {f.id !== funilSel && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: f.cor }} />}
                  {f.nome}{f.ativo ? "" : " (desativado)"}
                </button>
                {i < dados.funis.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1" onClick={async () => {
              const nome = prompt("Nome do novo funil:")
              if (!nome) return
              const r = await salvarFunil({ nome, ordem: dados.funis.length })
              if (!r.ok) return toast.error(r.erro)
              toast.success("Funil criado")
              setFunilSel(r.dados!.id)
              carregar()
            }}><Plus className="h-4 w-4" /> Novo funil</Button>
          </div>

          {funil && (
            <FunilEditor key={funil.id + JSON.stringify(funil)} funil={funil} funis={dados.funis} usuarios={dados.usuarios}
              onSalvar={f => res(salvarFunil(f), "Funil salvo")}
              onExcluir={async () => { if (confirm(`Excluir o funil "${funil.nome}"?`)) await res(excluirFunil(funil.id), "Funil excluído") }} />
          )}

          {/* Etapas do funil selecionado */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Etapas de &quot;{funil?.nome}&quot;</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Tipo <b>Ganho</b> pede o orçamento fechado; tipo <b>Perdido</b> pede o motivo. A chance (%) é usada na previsão de faturamento.
            </p>
            <div className="rounded-lg border divide-y">
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
              <Button variant="outline" className="gap-1 mt-2" onClick={() =>
                res(salvarEtapa({ funil_id: funil.id, nome: "Nova etapa", ordem: etapas.length, tipo: "aberta", cor: "#64748b", probabilidade: 20 }), "Etapa criada")
              }><Plus className="h-4 w-4" /> Adicionar etapa</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---------------- Campos e score ---------------- */}
      <CamposEditor campos={dados.campos} funis={dados.funis} config={config} setConfig={setConfig}
        onSalvarConfig={() => res(salvarConfigCrm(config), "Faixas do score salvas")}
        onSalvar={c => res(salvarCampo(c), "Campo salvo")}
        onExcluir={id => res(excluirCampo(id), "Campo excluído")}
        onReordenar={ids => res(reordenarCampos(ids))} />

      {/* ---------------- Regras gerais ---------------- */}
      <Card>
        <CardHeader><CardTitle>Regras gerais</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
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

// ======================================================================

function FunilEditor({ funil, funis, usuarios, onSalvar, onExcluir }: {
  funil: CrmFunil
  funis: CrmFunil[]
  usuarios: Usuario[]
  onSalvar: (f: CrmFunil) => void
  onExcluir: () => void
}) {
  const [f, setF] = useState<CrmFunil>({ ...funil, usuarios: funil.usuarios || [] })
  const mudou = JSON.stringify(f) !== JSON.stringify({ ...funil, usuarios: funil.usuarios || [] })
  const todos = !f.usuarios?.length
  const alternarUsuario = (id: string) => {
    const atual = f.usuarios || []
    setF({ ...f, usuarios: atual.includes(id) ? atual.filter(u => u !== id) : [...atual, id] })
  }

  return (
    <div className="rounded-xl border p-4 space-y-4" style={{ borderTop: `3px solid ${f.cor}` }}>
      <div className="grid sm:grid-cols-[1fr_auto] gap-3">
        <div className="grid gap-1.5">
          <Label>Nome do funil</Label>
          <input className={inp} value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label>Cor</Label>
          <input type="color" className="h-9 w-16 cursor-pointer rounded border" value={f.cor} onChange={e => setF({ ...f, cor: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Descrição (aparece no topo do quadro)</Label>
        <input className={inp} value={f.descricao || ""} onChange={e => setF({ ...f, descricao: e.target.value })} placeholder="Ex.: Pré-venda: levantar as informações antes de passar ao vendedor" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>Próximo funil (sugestão ao enviar)</Label>
          <select className={inp} value={f.proximo_funil_id || ""} onChange={e => setF({ ...f, proximo_funil_id: e.target.value || null })}>
            <option value="">— nenhum (último funil) —</option>
            {funis.filter(x => x.id !== f.id).map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </select>
        </div>
        <div className="grid gap-1.5 content-end">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#d97021]" checked={f.ativo} onChange={e => setF({ ...f, ativo: e.target.checked })} /> Funil ativo
          </label>
        </div>
      </div>

      <div className="rounded-lg bg-muted/40 p-3 space-y-3">
        <div>
          <Label>Quem trabalha neste funil</Label>
          <p className="text-xs text-muted-foreground mb-2">
            {todos ? "Nenhum marcado: todos os usuários veem este funil." : `${f.usuarios!.length} usuário(s). Administradores sempre veem tudo.`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {usuarios.map(u => {
              const marcado = f.usuarios?.includes(u.id)
              return (
                <button key={u.id} type="button" onClick={() => alternarUsuario(u.id)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${marcado ? "border-[#d97021] bg-orange-50 text-[#a8541a] font-medium" : "bg-background hover:bg-muted"}`}>
                  {marcado ? "✓ " : ""}{u.nome}
                </button>
              )
            })}
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[#d97021]" checked={f.membros_veem_todos}
              onChange={e => setF({ ...f, membros_veem_todos: e.target.checked, membros_editam_todos: e.target.checked && f.membros_editam_todos })} />
            Todos do funil veem os leads uns dos outros <span className="text-xs text-muted-foreground">(fila compartilhada — bom para Marketing e SDR)</span>
          </label>
          <label className={`flex items-center gap-2 pl-6 ${f.membros_veem_todos ? "" : "opacity-40"}`}>
            <input type="checkbox" className="h-4 w-4 accent-[#d97021]" disabled={!f.membros_veem_todos} checked={f.membros_editam_todos}
              onChange={e => setF({ ...f, membros_editam_todos: e.target.checked })} />
            …e também podem mover e editar os leads dos outros
          </label>
          {!f.membros_veem_todos && <p className="text-xs text-muted-foreground pl-6">Cada um vê só os leads em que é o responsável (bom para Vendedores).</p>}
        </div>
        <div className="space-y-1 text-sm border-t pt-3">
          <label className={`flex items-center gap-2 ${todos ? "opacity-40" : ""}`}>
            <input type="checkbox" className="h-4 w-4 accent-[#d97021]" disabled={todos} checked={f.distribuicao_automatica && !todos}
              onChange={e => setF({ ...f, distribuicao_automatica: e.target.checked })} />
            Rodízio automático: leads enviados para este funil vão, um de cada vez, para cada pessoa da lista
          </label>
          <p className="text-xs text-muted-foreground pl-6">
            {todos
              ? "Para usar o rodízio, marque acima quem trabalha neste funil."
              : "Quem envia ainda pode escolher uma pessoa específica; se não escolher, o sistema distribui em ordem alfabética, sempre para o próximo."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" className="text-red-600 gap-1" onClick={onExcluir}><Trash2 className="h-4 w-4" /> Excluir funil</Button>
        <Button size="sm" disabled={!mudou || !f.nome.trim()} className="gap-1 bg-[#d97021] hover:bg-[#c3631b]" onClick={() => onSalvar(f)}>
          <Save className="h-4 w-4" /> Salvar funil
        </Button>
      </div>
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

// ======================================================================

function CamposEditor({ campos, funis, config, setConfig, onSalvarConfig, onSalvar, onExcluir, onReordenar }: {
  campos: CrmCampo[]
  funis: CrmFunil[]
  config: CrmConfig
  setConfig: (c: CrmConfig) => void
  onSalvarConfig: () => void
  onSalvar: (c: Partial<CrmCampo> & { nome: string }) => Promise<boolean>
  onExcluir: (id: string) => void
  onReordenar: (ids: string[]) => void
}) {
  const [editando, setEditando] = useState<Partial<CrmCampo> | null>(null)
  const maximo = campos.filter(c => c.ativo).reduce((s, c) => s + pontosMaximos(c), 0)
  const nomeFunis = (ids: string[]) => ids?.length ? ids.map(id => funis.find(f => f.id === id)?.nome).filter(Boolean).join(", ") : "Todos os funis"
  const rotuloTipo = (t: string) => TIPOS_CAMPO.find(x => x.valor === t)?.rotulo || t

  const mover = (i: number, dir: -1 | 1) => {
    const ids = campos.map(c => c.id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    onReordenar(ids)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campos do lead e score (quente / frio)</CardTitle>
        <CardDescription>
          Crie as perguntas que o SDR e o vendedor preenchem sobre o lead. Cada resposta vale pontos; a soma é o score,
          que deixa o cartão frio, morno ou quente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Faixas */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700"><Snowflake className="h-4 w-4" /></span>
              <div><div className="font-semibold">Frio</div><div className="text-xs text-muted-foreground">abaixo de {config.score_morno}</div></div>
            </div>
            <div className="grid gap-1">
              <Label className="flex items-center gap-1 text-xs"><ThermometerSun className="h-3.5 w-3.5 text-amber-600" /> Morno a partir de</Label>
              <input className={`${inp} w-24 bg-background`} type="number" min={0} value={config.score_morno}
                onChange={e => setConfig({ ...config, score_morno: Number(e.target.value) })} />
            </div>
            <div className="grid gap-1">
              <Label className="flex items-center gap-1 text-xs"><Flame className="h-3.5 w-3.5 text-red-600" /> Quente a partir de</Label>
              <input className={`${inp} w-24 bg-background`} type="number" min={0} value={config.score_quente}
                onChange={e => setConfig({ ...config, score_quente: Number(e.target.value) })} />
            </div>
            <Button size="sm" variant="outline" className="gap-1 bg-background" onClick={onSalvarConfig}><Save className="h-4 w-4" /> Salvar faixas</Button>
            <span className="ml-auto text-sm text-muted-foreground">Pontuação máxima possível: <b className="text-foreground">{maximo}</b></span>
          </div>
        </div>

        {/* Lista de campos */}
        <div className="rounded-lg border divide-y">
          {campos.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum campo criado.</p>}
          {campos.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-3 px-3 py-2.5 ${c.ativo ? "" : "opacity-50"}`}>
              <div className="flex">
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === campos.length - 1} onClick={() => mover(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{c.nome}{c.ativo ? "" : " (desativado)"}</div>
                <div className="text-xs text-muted-foreground">{rotuloTipo(c.tipo)} · {nomeFunis(c.funis)}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pontosMaximos(c) ? "bg-orange-50 text-[#a8541a]" : "bg-muted text-muted-foreground"}`}>
                até {pontosMaximos(c)} pts
              </span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditando(c)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => { if (confirm(`Excluir o campo "${c.nome}"? As respostas já dadas deixam de contar no score.`)) onExcluir(c.id) }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" className="gap-1" onClick={() => setEditando({ nome: "", tipo: "selecao", opcoes: [{ rotulo: "", pontos: 0 }], pontos_sim: 10, funis: [], ativo: true, ordem: campos.length })}>
          <Plus className="h-4 w-4" /> Novo campo
        </Button>
      </CardContent>

      <CampoDialog campo={editando} funis={funis} onFechar={() => setEditando(null)}
        onSalvar={async c => { if (await onSalvar(c)) setEditando(null) }} />
    </Card>
  )
}

function CampoDialog({ campo, funis, onFechar, onSalvar }: {
  campo: Partial<CrmCampo> | null
  funis: CrmFunil[]
  onFechar: () => void
  onSalvar: (c: Partial<CrmCampo> & { nome: string }) => void
}) {
  const [c, setC] = useState<Partial<CrmCampo>>({})
  useEffect(() => { if (campo) setC(JSON.parse(JSON.stringify(campo))) }, [campo])
  const opcoes = (c.opcoes || []) as CrmOpcaoCampo[]
  const setOpcao = (i: number, o: Partial<CrmOpcaoCampo>) => setC({ ...c, opcoes: opcoes.map((x, k) => k === i ? { ...x, ...o } : x) })
  const trocarTipo = (tipo: CrmCampo["tipo"]) => setC({
    ...c, tipo,
    opcoes: tipo === "selecao" ? (opcoes.some(o => o.rotulo !== undefined) ? opcoes : [{ rotulo: "", pontos: 0 }])
      : tipo === "numero" ? [{ min: 0, pontos: 0 }] : [],
  })
  const alternarFunil = (id: string) => {
    const atual = c.funis || []
    setC({ ...c, funis: atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id] })
  }

  return (
    <Dialog open={!!campo} onOpenChange={o => { if (!o) onFechar() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{c.id ? "Editar campo" : "Novo campo do lead"}</DialogTitle>
          <DialogDescription>A pergunta aparece na página do lead, no bloco &quot;Qualificação&quot;.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label>Pergunta / nome do campo *</Label>
            <input className={inp} value={c.nome || ""} onChange={e => setC({ ...c, nome: e.target.value })} placeholder="Ex.: Prazo para comprar" />
          </div>
          <div className="grid gap-1.5">
            <Label>Texto de ajuda (opcional)</Label>
            <input className={inp} value={c.ajuda || ""} onChange={e => setC({ ...c, ajuda: e.target.value })} placeholder="Ex.: Quando o cliente pretende fechar" />
          </div>
          <div className="grid gap-1.5">
            <Label>Tipo de resposta</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {TIPOS_CAMPO.map(t => (
                <button key={t.valor} type="button" onClick={() => trocarTipo(t.valor)}
                  className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${c.tipo === t.valor ? "border-[#d97021] bg-orange-50 font-medium text-[#a8541a]" : "hover:bg-muted"}`}>
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>

          {c.tipo === "selecao" && (
            <div className="space-y-2">
              <Label>Opções e pontos</Label>
              {opcoes.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inp} value={o.rotulo || ""} placeholder={`Opção ${i + 1}`} onChange={e => setOpcao(i, { rotulo: e.target.value })} />
                  <input className={`${inp} w-24`} type="number" value={o.pontos} onChange={e => setOpcao(i, { pontos: Number(e.target.value) })} title="Pontos" />
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setC({ ...c, opcoes: opcoes.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setC({ ...c, opcoes: [...opcoes, { rotulo: "", pontos: 0 }] })}><Plus className="h-3.5 w-3.5" /> Opção</Button>
            </div>
          )}

          {c.tipo === "sim_nao" && (
            <div className="grid gap-1.5">
              <Label>Pontos quando a resposta for &quot;Sim&quot;</Label>
              <input className={`${inp} w-28`} type="number" value={c.pontos_sim ?? 0} onChange={e => setC({ ...c, pontos_sim: Number(e.target.value) })} />
            </div>
          )}

          {c.tipo === "numero" && (
            <div className="space-y-2">
              <Label>Faixas de pontos (vale a maior faixa alcançada)</Label>
              {opcoes.map((o, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 text-muted-foreground">A partir de</span>
                  <input className={`${inp} w-28`} type="number" value={o.min ?? 0} onChange={e => setOpcao(i, { min: Number(e.target.value) })} />
                  <span className="shrink-0 text-muted-foreground">vale</span>
                  <input className={`${inp} w-20`} type="number" value={o.pontos} onChange={e => setOpcao(i, { pontos: Number(e.target.value) })} />
                  <span className="shrink-0 text-muted-foreground">pts</span>
                  <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setC({ ...c, opcoes: opcoes.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setC({ ...c, opcoes: [...opcoes, { min: 0, pontos: 0 }] })}><Plus className="h-3.5 w-3.5" /> Faixa</Button>
            </div>
          )}

          {(c.tipo === "texto" || c.tipo === "data") && (
            <p className="text-xs text-muted-foreground">Campos de texto e data servem para registrar informação; não somam pontos.</p>
          )}

          <div className="grid gap-1.5">
            <Label>Aparece em quais funis?</Label>
            <div className="flex flex-wrap gap-1.5">
              {funis.map(f => {
                const marcado = c.funis?.includes(f.id)
                return (
                  <button key={f.id} type="button" onClick={() => alternarFunil(f.id)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${marcado ? "text-white" : "hover:bg-muted"}`}
                    style={marcado ? { backgroundColor: f.cor, borderColor: f.cor } : undefined}>
                    {f.nome}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">{c.funis?.length ? "Só nos funis marcados (depois de preenchido, continua visível nos outros)." : "Nenhum marcado: aparece em todos os funis."}</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#d97021]" checked={c.ativo ?? true} onChange={e => setC({ ...c, ativo: e.target.checked })} /> Campo ativo
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button disabled={!c.nome?.trim()} className="bg-[#d97021] hover:bg-[#c3631b]" onClick={() => onSalvar(c as Partial<CrmCampo> & { nome: string })}>Salvar campo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ======================================================================

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
