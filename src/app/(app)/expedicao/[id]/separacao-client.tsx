"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, ArrowLeft, Check, ClipboardCheck, PackageCheck, Printer, RotateCcw, Truck, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  devolverParaSeparacao, finalizarConferencia, finalizarSeparacao, iniciarConferencia, iniciarSeparacao, marcarItem, reabrirSeparacao,
  type TelaSeparacao,
} from "@/app/actions/expedicao"
import { MOTIVOS_FALTA, STATUS_SEPARACAO, chavesDosItens, type SepItem } from "@/lib/entregas-types"

const laranja = "bg-[#d97021] hover:bg-[#c3631b] text-white"
const qtd = (n: number | null | undefined) => (n == null ? "—" : String(n).replace(".", ","))
const lerNumero = (t: string) => { const n = Number(t.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : null }
const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "")
function dataBr(iso: string | null | undefined) {
  if (!iso) return ""
  const [a, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${a}`
}

export function SeparacaoClient({ entrega: e, userId, gerente }: TelaSeparacao) {
  const router = useRouter()
  const sep = e.separacao
  const status = sep?.status || "pendente"
  const [marcas, setMarcas] = useState<SepItem[]>(sep?.itens || [])
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null) // produto com o formulário de "faltou"/"contei diferente" aberto
  const [formQtd, setFormQtd] = useState("")
  const [formMotivo, setFormMotivo] = useState("")
  const [formOutro, setFormOutro] = useState("")
  const [obs, setObs] = useState(sep?.obs || "")
  const [esconderFeitos, setEsconderFeitos] = useState(false)

  const chaves = chavesDosItens(e.itens)
  const porChave = new Map(marcas.map(m => [m.chave, m]))
  const separando = status === "separando"
  const conferindo = status === "conferindo"
  const souConferente = conferindo && sep?.conferido_por === userId
  const souSeparador = sep?.separado_por === userId
  const etapaConferencia = status === "conferindo" || status === "conferida"
  const feito = (k: string) => { const m = porChave.get(k); return etapaConferencia ? m?.conferida != null : m?.separada != null }
  const feitos = chaves.filter(feito).length
  const pedidoMudou = !!sep && status !== "separando" && chaves.some(k => porChave.get(k)?.separada == null)

  const executar = async (rotulo: string, acao: () => Promise<{ ok: boolean; erro?: string }>, sucesso: string) => {
    setOcupado(rotulo)
    try {
      const r = await acao()
      if (!r.ok) { toast.error(r.erro || "Não deu certo."); return false }
      toast.success(sucesso)
      router.refresh()
      return true
    } finally {
      setOcupado(null)
    }
  }

  const marcar = async (chave: string, campos: Parameters<typeof marcarItem>[2]) => {
    setOcupado(chave)
    // mostra na hora; se der erro, volta
    const antes = marcas
    const atual = porChave.get(chave) || { chave, separada: null, motivo: null, conferida: null }
    setMarcas([...marcas.filter(m => m.chave !== chave), { ...atual, ...campos }])
    const r = await marcarItem(e.id, chave, campos)
    setOcupado(null)
    if (!r.ok) { setMarcas(antes); toast.error(r.erro); return }
    if (r.dados) setMarcas(r.dados)
    setAberto(null)
  }

  const abrirForm = (chave: string, inicialQtd: number | null, motivo: string | null) => {
    setAberto(chave)
    setFormQtd(inicialQtd == null ? "" : qtd(inicialQtd))
    const conhecido = (MOTIVOS_FALTA as readonly string[]).includes(motivo || "")
    setFormMotivo(motivo ? (conhecido ? motivo : "Outro") : "")
    setFormOutro(motivo && !conhecido ? motivo : "")
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pb-28">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link href="/expedicao" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Expedição</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Printer className="h-4 w-4" /> Imprimir lista</button>
      </div>

      <header className="rounded-xl border bg-background p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{e.destinatario}</h1>
            <div className="text-sm text-muted-foreground">
              {[e.cidade && `${e.cidade}${e.uf ? ` - ${e.uf}` : ""}`, e.pedido_erp && `Pedido ${e.pedido_erp}`, `${e.itens.length} produto(s)`, e.peso_kg ? `${qtd(e.peso_kg)} kg` : null].filter(Boolean).join(" · ")}
            </div>
            <div className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" /> {e.viagem ? `Sai ${dataBr(e.viagem.saida_prevista)}${e.viagem.titulo ? ` · ${e.viagem.titulo}` : ""}` : "Sem viagem marcada"}
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${STATUS_SEPARACAO[status].classe}`}>{STATUS_SEPARACAO[status].rotulo}</span>
        </div>
        {e.observacoes && <p className="mt-2 rounded bg-amber-50 p-2 text-sm text-amber-900">{e.observacoes}</p>}
        {sep && (
          <div className="mt-2 grid gap-0.5 text-xs text-muted-foreground">
            {sep.separado_por_nome && <span>Separação: <b className="text-foreground">{sep.separado_por_nome}</b>{sep.separado_em ? ` · finalizada em ${dataHora(sep.separado_em)}` : ` · começou em ${dataHora(sep.separacao_inicio)}`}</span>}
            {sep.conferido_por_nome && <span>Conferência: <b className="text-foreground">{sep.conferido_por_nome}</b>{sep.conferido_em ? ` · finalizada em ${dataHora(sep.conferido_em)}` : " · em andamento"}</span>}
            {sep.obs && <span>Obs. da separação: {sep.obs}</span>}
            {(sep.devolucoes || []).map((d, i) => (
              <span key={i} className="text-red-700">Devolvida para separação por {d.por} em {dataHora(d.em)}: {d.motivo}</span>
            ))}
          </div>
        )}
      </header>

      {pedidoMudou && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Os produtos da entrega mudaram depois da separação (pedido importado de novo ou editado). {gerente ? "Refaça a separação." : "Avise a logística."}</span>
        </div>
      )}

      {/* Ações da etapa */}
      <section className="rounded-xl border bg-background p-4 shadow-sm print:hidden">
        {status === "pendente" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Pegue os produtos da lista abaixo no estoque e vá marcando cada um.</p>
            <Button className={`h-12 w-full text-base ${laranja}`} disabled={!!ocupado}
              onClick={() => executar("ini", () => iniciarSeparacao(e.id), "Separação começou")}>
              <PackageCheck className="h-5 w-5" /> Começar separação
            </Button>
          </div>
        )}
        {separando && <p className="text-sm"><b>{feitos} de {chaves.length}</b> produtos marcados. Toque em <b>Separei</b> quando pegar a quantidade toda, ou em <b>Faltou</b> se não tiver tudo.</p>}
        {status === "separada" && (
          souSeparador ? (
            <p className="text-sm">Separação finalizada. <b>Agora outra pessoa precisa conferir</b> — quem separou não pode conferir.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">Separado por <b>{sep?.separado_por_nome}</b>. Confira cada produto contando de novo o que está separado.</p>
              <Button className="h-12 w-full bg-blue-600 text-base text-white hover:bg-blue-700" disabled={!!ocupado}
                onClick={() => executar("conf", () => iniciarConferencia(e.id), "Conferência começou")}>
                <ClipboardCheck className="h-5 w-5" /> Começar conferência
              </Button>
            </div>
          )
        )}
        {conferindo && (souConferente
          ? <p className="text-sm"><b>{feitos} de {chaves.length}</b> conferidos. Conte cada produto: toque em <b>Confere</b> se bater com o separado, ou em <b>Contei diferente</b>.</p>
          : <p className="text-sm">Conferência em andamento por <b>{sep?.conferido_por_nome}</b>.</p>)}
        {status === "conferida" && (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Check className="h-5 w-5" /> Carga conferida e pronta para carregar.{sep?.divergencia ? " Atenção: tem falta registrada (veja os itens em amarelo)." : ""}</p>
        )}
        {(status === "separada" || conferindo) && (souConferente || gerente || (status === "separada" && !souSeparador)) && (
          <button className="mt-3 inline-flex items-center gap-1 text-sm text-red-700 hover:underline" disabled={!!ocupado}
            onClick={() => {
              const m = prompt("O que está errado na separação? (volta para quem separa)")
              if (m) executar("dev", () => devolverParaSeparacao(e.id, m), "Devolvida para a separação")
            }}>
            <Undo2 className="h-4 w-4" /> Devolver para a separação
          </button>
        )}
        {gerente && sep && (status === "conferida" || pedidoMudou) && (
          <button className="mt-3 ml-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-red-700" disabled={!!ocupado}
            onClick={() => { if (confirm("Apagar a separação e a conferência desta entrega e começar do zero?")) executar("reab", () => reabrirSeparacao(e.id), "Separação reaberta") }}>
            <RotateCcw className="h-4 w-4" /> Refazer separação
          </button>
        )}
      </section>

      {/* Lista de produtos */}
      <section className="space-y-2">
        <div className="flex items-center justify-between print:hidden">
          <h2 className="font-semibold">Produtos</h2>
          {(separando || souConferente) && (
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input type="checkbox" checked={esconderFeitos} onChange={x => setEsconderFeitos(x.target.checked)} /> esconder os já marcados
            </label>
          )}
        </div>
        <ul className="space-y-2">
          {e.itens.map((it, k) => {
            const chave = chaves[k]
            const m = porChave.get(chave)
            const pedida = Number(it.quantidade)
            if (esconderFeitos && feito(chave) && aberto !== chave) return null
            const sepOk = m?.separada != null && m.separada === pedida
            const sepFalta = m?.separada != null && m.separada !== pedida
            const confOk = m?.conferida != null && m.conferida === m.separada
            const confErro = m?.conferida != null && m.conferida !== m.separada
            const cor = etapaConferencia
              ? (confErro ? "border-red-300 bg-red-50" : confOk ? (sepFalta ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50") : "bg-background")
              : (sepFalta ? "border-amber-300 bg-amber-50" : sepOk ? "border-emerald-300 bg-emerald-50" : "bg-background")
            const carregando = ocupado === chave
            return (
              <li key={chave} className={`rounded-xl border p-3 shadow-sm ${cor} ${carregando ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="w-20 shrink-0 text-right">
                    <div className="text-xl font-bold leading-tight">{qtd(pedida)}</div>
                    <div className="text-xs text-muted-foreground">{it.unidade || ""}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium leading-snug">{it.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.codigo ? `Cód. ${it.codigo}` : ""}{it.pedido && (e.pedido_erp || "").includes(",") ? ` · ped. ${it.pedido}` : ""}
                    </div>
                    {it.obs && <div className="mt-0.5 text-xs text-amber-800">{it.obs}</div>}
                    {m?.separada != null && (
                      <div className={`mt-1 text-sm ${sepFalta ? "font-semibold text-amber-800" : "text-emerald-700"}`}>
                        {sepFalta ? `Separado ${qtd(m.separada)} de ${qtd(pedida)}${m.motivo ? ` · ${m.motivo}` : ""}` : `✓ ${qtd(m.separada)} separado(s)`}
                      </div>
                    )}
                    {m?.conferida != null && (
                      <div className={`text-sm ${confErro ? "font-semibold text-red-700" : "text-emerald-700"}`}>
                        {confErro ? `Conferido ${qtd(m.conferida)} — não bate com o separado (${qtd(m.separada)})` : `✓ conferido`}
                      </div>
                    )}
                  </div>
                </div>

                {/* botões da separação */}
                {separando && aberto !== chave && (
                  <div className="mt-2 flex gap-2 print:hidden">
                    {m?.separada == null ? (
                      <>
                        <Button className="h-11 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={carregando}
                          onClick={() => marcar(chave, { separada: pedida, motivo: null })}>
                          <Check className="h-4 w-4" /> Separei {qtd(pedida)}
                        </Button>
                        <Button variant="outline" className="h-11 flex-1 border-amber-400 text-amber-800" disabled={carregando}
                          onClick={() => abrirForm(chave, null, null)}>Faltou</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" disabled={carregando} onClick={() => abrirForm(chave, m.separada, m.motivo)}>Alterar</Button>
                        <Button variant="ghost" size="sm" disabled={carregando} onClick={() => marcar(chave, { separada: null, motivo: null })}>Desfazer</Button>
                      </>
                    )}
                  </div>
                )}
                {separando && aberto === chave && (
                  <div className="mt-2 space-y-2 rounded-lg border bg-background p-2 print:hidden">
                    <label className="flex items-center gap-2 text-sm">
                      Quantidade separada:
                      <input className="h-10 w-24 rounded border px-2 text-right text-base" inputMode="decimal" autoFocus value={formQtd} onChange={x => setFormQtd(x.target.value)} placeholder="0" />
                      <span className="text-muted-foreground">de {qtd(pedida)} {it.unidade || ""}</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {MOTIVOS_FALTA.map(mo => (
                        <button key={mo} type="button" onClick={() => setFormMotivo(mo)}
                          className={`rounded-full border px-3 py-1.5 text-sm ${formMotivo === mo ? "border-amber-500 bg-amber-100 font-semibold text-amber-900" : "bg-background"}`}>{mo}</button>
                      ))}
                    </div>
                    {formMotivo === "Outro" && <input className="h-10 w-full rounded border px-2" placeholder="Qual o motivo?" value={formOutro} onChange={x => setFormOutro(x.target.value)} />}
                    <div className="flex gap-2">
                      <Button className={`flex-1 ${laranja}`} disabled={carregando} onClick={() => {
                        const n = lerNumero(formQtd || "0")
                        if (n == null) return toast.error("Quantidade inválida.")
                        const motivo = formMotivo === "Outro" ? formOutro.trim() : formMotivo
                        if (n !== pedida && !motivo) return toast.error("Escolha o motivo da diferença.")
                        marcar(chave, { separada: n, motivo: n === pedida ? null : motivo })
                      }}>Salvar</Button>
                      <Button variant="ghost" onClick={() => setAberto(null)}>Cancelar</Button>
                    </div>
                  </div>
                )}

                {/* botões da conferência */}
                {souConferente && aberto !== chave && (
                  <div className="mt-2 flex gap-2 print:hidden">
                    {m?.conferida == null ? (
                      <>
                        <Button className="h-11 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={carregando || m?.separada == null}
                          onClick={() => marcar(chave, { conferida: m?.separada ?? null })}>
                          <Check className="h-4 w-4" /> Confere {qtd(m?.separada)}
                        </Button>
                        <Button variant="outline" className="h-11 flex-1 border-red-300 text-red-700" disabled={carregando}
                          onClick={() => { setAberto(chave); setFormQtd("") }}>Contei diferente</Button>
                      </>
                    ) : (
                      <Button variant="ghost" size="sm" disabled={carregando} onClick={() => marcar(chave, { conferida: null })}>Desfazer</Button>
                    )}
                  </div>
                )}
                {souConferente && aberto === chave && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2 print:hidden">
                    <span className="text-sm">Contei:</span>
                    <input className="h-10 w-24 rounded border px-2 text-right text-base" inputMode="decimal" autoFocus value={formQtd} onChange={x => setFormQtd(x.target.value)} />
                    <Button className={laranja} disabled={carregando} onClick={() => {
                      const n = lerNumero(formQtd)
                      if (n == null) return toast.error("Quantidade inválida.")
                      marcar(chave, { conferida: n })
                    }}>Salvar</Button>
                    <Button variant="ghost" onClick={() => setAberto(null)}>Cancelar</Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* Rodapé fixo para finalizar */}
      {(separando || souConferente) && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur print:hidden md:left-72">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            {separando && feitos === chaves.length && (
              <Textarea rows={1} className="min-h-9" placeholder="Observação da separação (opcional)" value={obs} onChange={x => setObs(x.target.value)} />
            )}
            <Button className={`h-12 w-full text-base ${separando ? laranja : "bg-blue-600 text-white hover:bg-blue-700"}`}
              disabled={!!ocupado || feitos < chaves.length}
              onClick={() => separando
                ? executar("fim", () => finalizarSeparacao(e.id, obs), "Separação finalizada. Agora outra pessoa confere.")
                : executar("fimc", () => finalizarConferencia(e.id), "Carga conferida!")}>
              {feitos < chaves.length
                ? `Faltam ${chaves.length - feitos} produto(s) para marcar`
                : separando ? "Finalizar separação" : "Finalizar conferência"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
