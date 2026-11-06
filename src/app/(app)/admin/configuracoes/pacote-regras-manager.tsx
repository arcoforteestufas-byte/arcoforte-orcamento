"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Database, BookOpen } from "lucide-react"
import {
  aplicarPacoteTexto,
  exportarPacoteAtual,
  obterInfoPacote,
  validarPacoteTexto,
  type ResultadoValidacao,
} from "@/app/actions/pacote-regras"
import { salvarManualOficial } from "@/app/actions/documentacao"

type Info = Awaited<ReturnType<typeof obterInfoPacote>>

function baixar(nome: string, conteudo: string, tipo = "application/json") {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function textoRegra(r?: { grupo: number; posicao: string; produto: string; formula: string; condicao: string | null }) {
  if (!r) return ""
  return `[${r.grupo}] ${r.posicao} · ${r.produto} · ${r.formula}${r.condicao ? `  SE  ${r.condicao}` : ""}`
}

export function PacoteRegrasManager() {
  const [info, setInfo] = useState<Info | null>(null)
  const [texto, setTexto] = useState("")
  const [textoValidado, setTextoValidado] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoValidacao | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [mostrarIguais, setMostrarIguais] = useState(false)
  const [mensagemFinal, setMensagemFinal] = useState<{ ok: boolean; texto: string; avisos?: string[] } | null>(null)
  const inputPacote = useRef<HTMLInputElement>(null)

  // Manuais
  const [manualTecnico, setManualTecnico] = useState<{ nome: string; conteudo: string } | null>(null)
  const [manualHumano, setManualHumano] = useState<{ nome: string; conteudo: string } | null>(null)
  const [versaoManual, setVersaoManual] = useState("")
  const [resumoManual, setResumoManual] = useState("")

  const carregarInfo = async () => setInfo(await obterInfoPacote())
  useEffect(() => {
    carregarInfo()
  }, [])

  const lerArquivo = (arquivo: File | undefined, destino: (v: { nome: string; conteudo: string }) => void) => {
    if (!arquivo) return
    const leitor = new FileReader()
    leitor.onload = () => destino({ nome: arquivo.name, conteudo: String(leitor.result || "") })
    leitor.readAsText(arquivo, "utf-8")
  }

  const exportar = async () => {
    setOcupado("exportar")
    const r = await exportarPacoteAtual()
    setOcupado(null)
    if (!r.sucesso || !r.texto) return toast.error(r.erro || "Falha ao exportar.")
    baixar(r.nomeArquivo!, r.texto)
    toast.success("Pacote exportado. O arquivo foi baixado.")
  }

  const validar = async () => {
    setOcupado("validar")
    setConfirmando(false)
    setMensagemFinal(null)
    const r = await validarPacoteTexto(texto)
    setResultado(r)
    setTextoValidado(texto)
    setOcupado(null)
    if (r.ok) toast.success("Pacote conferido: nenhum erro.")
    else toast.error("O pacote tem erros. Veja a lista abaixo.")
  }

  const aplicar = async () => {
    setOcupado("aplicar")
    const r = await aplicarPacoteTexto(texto)
    setOcupado(null)
    setConfirmando(false)
    setMensagemFinal({ ok: r.sucesso, texto: r.mensagem, avisos: r.avisos })
    if (r.resultado) setResultado(r.resultado)
    if (r.sucesso) {
      toast.success("Pacote aplicado.")
      setTextoValidado(null)
      carregarInfo()
    } else toast.error("O pacote não foi aplicado.")
  }

  const salvarManuais = async () => {
    if (!manualTecnico && !manualHumano) return toast.warning("Escolha ao menos um arquivo .md.")
    setOcupado("manuais")
    const resumo = resumoManual.trim() || "Enviado pela tela Pacote de Regras"
    const envios: [string, "tecnico" | "humano", { nome: string; conteudo: string } | null][] = [
      ["Manual técnico", "tecnico", manualTecnico],
      ["Manual dos vendedores", "humano", manualHumano],
    ]
    for (const [nome, tipo, arq] of envios) {
      if (!arq) continue
      const r: any = await salvarManualOficial(tipo, arq.conteudo, versaoManual.trim() || undefined, resumo)
      if (r?.success === false || r?.sucesso === false || r?.error || r?.erro) toast.error(`${nome}: ${r.error || r.erro || "falha ao salvar"}`)
      else toast.success(`${nome} salvo como nova versão.`)
    }
    setOcupado(null)
  }

  const validadoAtual = resultado && textoValidado === texto
  const erros = resultado?.problemas.filter(p => p.nivel === "erro") ?? []
  const avisos = resultado?.problemas.filter(p => p.nivel === "aviso") ?? []
  const mudancas = resultado?.regras.filter(r => r.status !== "igual") ?? []

  return (
    <div className="space-y-6">
      {/* Ambiente */}
      <Card className="border-slate-200">
        <CardContent className="py-4 flex flex-wrap items-center gap-3 text-sm">
          <Database className="h-4 w-4 text-slate-500" />
          <span className="text-slate-600">Banco deste ambiente:</span>
          <Badge variant="outline" className="font-mono">{info?.ambiente ?? "…"}</Badge>
          <span className="text-slate-400">|</span>
          {info?.aplicado ? (
            <span className="text-slate-600">
              Último pacote aplicado: <b>v{info.aplicado.versao}</b> em {new Date(info.aplicado.aplicado_em).toLocaleString("pt-BR")} por {info.aplicado.aplicado_por}
            </span>
          ) : (
            <span className="text-slate-500">Nenhum pacote aplicado ainda neste banco.</span>
          )}
          {info && !info.sucesso && <span className="text-red-600">{info.erro}</span>}
        </CardContent>
      </Card>

      {/* Exportar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> 1. Exportar o pacote atual</CardTitle>
          <CardDescription>Baixa um arquivo com todas as regras, parâmetros e grupos que estão ativos neste banco agora. É esse arquivo que você leva para o Claude ajustar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportar} disabled={!!ocupado} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> {ocupado === "exportar" ? "Exportando..." : "Baixar pacote atual (.json)"}
          </Button>
        </CardContent>
      </Card>

      {/* Importar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> 2. Enviar um pacote de regras</CardTitle>
          <CardDescription>Escolha o arquivo .json que o Claude entregou. Primeiro o sistema confere tudo e mostra o que vai mudar. Nada é gravado até você confirmar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              ref={inputPacote}
              type="file"
              accept=".json,application/json"
              className="max-w-sm cursor-pointer"
              onChange={e => lerArquivo(e.target.files?.[0], v => { setTexto(v.conteudo); setResultado(null); setMensagemFinal(null) })}
            />
            <span className="text-xs text-slate-500">ou cole o conteúdo abaixo</span>
          </div>
          <Textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder='{ "formato": "arcoforte-pacote-regras", ... }'
            className="font-mono text-xs h-40"
            spellCheck={false}
            aria-label="Conteúdo do pacote de regras"
          />
          <Button onClick={validar} disabled={!texto.trim() || !!ocupado} className="gap-2">
            <ShieldCheck className="h-4 w-4" /> {ocupado === "validar" ? "Conferindo..." : "Conferir pacote"}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado */}
      {resultado && (
        <Card className={erros.length ? "border-red-300" : "border-green-300"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {erros.length ? <XCircle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
              Resultado da conferência {resultado.versao ? `— pacote v${resultado.versao}` : ""}
            </CardTitle>
            <CardDescription>
              Banco <b className="font-mono">{resultado.ambiente}</b>: {resultado.resumo.novas} regras novas, {resultado.resumo.alteradas} alteradas,{" "}
              {resultado.resumo.desativadas} a desligar, {resultado.resumo.iguais} sem mudança · {resultado.resumo.parametros} mudanças de parâmetros · {resultado.resumo.grupos} de grupos ·{" "}
              {erros.length} erros · {avisos.length} avisos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm">
            {erros.length > 0 && (
              <div data-secao="erros">
                <h4 className="font-semibold text-red-700 mb-2">Erros (impedem aplicar)</h4>
                <ul className="space-y-1">
                  {erros.map((p, i) => (
                    <li key={i} className="text-red-700"><b>{p.onde}:</b> {p.mensagem}</li>
                  ))}
                </ul>
              </div>
            )}
            {avisos.length > 0 && (
              <div data-secao="avisos">
                <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Avisos</h4>
                <ul className="space-y-1">
                  {avisos.map((p, i) => (
                    <li key={i} className="text-amber-800"><b>{p.onde}:</b> {p.mensagem}</li>
                  ))}
                </ul>
              </div>
            )}
            {resultado.exemplos.length > 0 && (
              <div data-secao="exemplos">
                <h4 className="font-semibold mb-2">Exemplos conferidos</h4>
                {resultado.exemplos.map(ex => (
                  <div key={ex.nome} className="mb-3">
                    <div className={ex.ok ? "text-green-700" : "text-red-700"}>{ex.ok ? "✔" : "✘"} {ex.nome}</div>
                    <table className="mt-1 text-xs border w-full max-w-xl">
                      <thead><tr className="bg-slate-50"><th className="text-left p-1">Produto</th><th className="text-right p-1">Esperado</th><th className="text-right p-1">Calculado</th></tr></thead>
                      <tbody>
                        {ex.linhas.map(l => (
                          <tr key={l.produto} className={l.ok ? "" : "bg-red-50 text-red-700"}>
                            <td className="p-1 font-mono">{l.produto}</td>
                            <td className="p-1 text-right">{l.esperado ?? "—"}</td>
                            <td className="p-1 text-right">{l.calculado ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
            {(mudancas.length > 0 || resultado.parametros.length > 0 || resultado.grupos.length > 0) && (
              <div data-secao="mudancas">
                <h4 className="font-semibold mb-2">O que muda neste banco</h4>
                <ul className="space-y-2 font-mono text-xs">
                  {resultado.grupos.map(g => (
                    <li key={`g${g.ordem}`}><Badge variant="outline">grupo {g.status}</Badge> {g.ordem}: {g.antes ? `${g.antes} → ` : ""}{g.depois}</li>
                  ))}
                  {resultado.parametros.map(p => (
                    <li key={`p${p.nome_tecnico}`}>
                      <Badge variant="outline">parâmetro {p.status}</Badge> {p.nome_tecnico}
                      {p.antes && <div className="text-red-700">− {p.antes}</div>}
                      {p.depois && <div className="text-green-700">+ {p.depois}</div>}
                    </li>
                  ))}
                  {mudancas.map((r, i) => (
                    <li key={`r${i}`}>
                      <Badge variant="outline">{r.status === "desativar" ? "desligar" : r.status}</Badge> {r.id_pacote ?? "(fora do pacote)"}
                      {r.antes && r.status !== "nova" && <div className="text-red-700">− {textoRegra(r.antes)}</div>}
                      {r.depois && r.status !== "desativar" && <div className="text-green-700">+ {textoRegra(r.depois)}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <button type="button" className="text-xs underline text-slate-500" onClick={() => setMostrarIguais(v => !v)}>
                {mostrarIguais ? "Ocultar" : "Mostrar"} as {resultado.resumo.iguais} regras sem mudança
              </button>
              {mostrarIguais && (
                <ul className="mt-2 space-y-1 font-mono text-xs text-slate-500">
                  {resultado.regras.filter(r => r.status === "igual").map(r => (
                    <li key={r.id_pacote}>{r.id_pacote} · {textoRegra(r.depois)}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Aplicar */}
            <div className="border-t pt-4 space-y-3">
              {!validadoAtual && <p className="text-amber-700">O conteúdo mudou desde a conferência. Clique em "Conferir pacote" de novo.</p>}
              {!confirmando ? (
                <Button onClick={() => setConfirmando(true)} disabled={!validadoAtual || erros.length > 0 || !!ocupado} className="gap-2">
                  <Database className="h-4 w-4" /> Aplicar no banco {resultado.ambiente}
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-md bg-amber-50 border border-amber-200">
                  <span>Gravar o pacote v{resultado.versao} no banco <b className="font-mono">{resultado.ambiente}</b>? Os orçamentos novos passam a usar estas regras.</span>
                  <Button onClick={aplicar} disabled={!!ocupado} variant="destructive">{ocupado === "aplicar" ? "Aplicando..." : "Sim, aplicar"}</Button>
                  <Button onClick={() => setConfirmando(false)} variant="outline" disabled={!!ocupado}>Cancelar</Button>
                </div>
              )}
              {mensagemFinal && (
                <div className={mensagemFinal.ok ? "text-green-700" : "text-red-700"} data-secao="mensagem-final">
                  {mensagemFinal.texto}
                  {mensagemFinal.avisos?.map((a, i) => <div key={i} className="text-amber-700">{a}</div>)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manuais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> 3. Enviar os manuais (.md)</CardTitle>
          <CardDescription>Substitui o texto dos manuais na aba Documentação. A versão anterior fica guardada no histórico de versões de lá.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Manual técnico (regras e fórmulas)</Label>
              <Input type="file" accept=".md,text/markdown" className="cursor-pointer" onChange={e => lerArquivo(e.target.files?.[0], setManualTecnico)} />
              {manualTecnico && <span className="text-xs text-slate-500">{manualTecnico.nome} · {manualTecnico.conteudo.length} caracteres</span>}
            </div>
            <div className="grid gap-2">
              <Label>Manual dos vendedores (linguagem simples)</Label>
              <Input type="file" accept=".md,text/markdown" className="cursor-pointer" onChange={e => lerArquivo(e.target.files?.[0], setManualHumano)} />
              {manualHumano && <span className="text-xs text-slate-500">{manualHumano.nome} · {manualHumano.conteudo.length} caracteres</span>}
            </div>
            <div className="grid gap-2">
              <Label>Versão (opcional)</Label>
              <Input value={versaoManual} onChange={e => setVersaoManual(e.target.value)} placeholder="ex.: 2.0" />
            </div>
            <div className="grid gap-2">
              <Label>O que mudou (opcional)</Label>
              <Input value={resumoManual} onChange={e => setResumoManual(e.target.value)} placeholder="ex.: regras de cabo de aço revisadas" />
            </div>
          </div>
          <Button onClick={salvarManuais} disabled={(!manualTecnico && !manualHumano) || !!ocupado} className="gap-2">
            <BookOpen className="h-4 w-4" /> {ocupado === "manuais" ? "Salvando..." : "Salvar manuais"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
