"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown, MapPin, Search } from "lucide-react"
import { listarCidades } from "@/app/actions/entregas"
import { NOMES_UF, type CidadeOpcao } from "@/lib/entregas-types"
import { cn } from "@/lib/utils"

const cache = new Map<string, Promise<CidadeOpcao[]>>()
function cidadesDe(uf: string) {
  if (!cache.has(uf)) cache.set(uf, listarCidades(uf))
  return cache.get(uf)!
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
const UFS_ORDEM = Object.keys(NOMES_UF).sort()

/**
 * Escolha de cidade: primeiro o estado, depois busca a cidade dentro dele.
 * Devolve a cidade com código IBGE e coordenadas.
 */
export function CidadeSelect({ uf, cidade, onChange, placeholder = "Buscar cidade...", className = "" }: {
  uf: string | null | undefined
  cidade: string | null | undefined
  onChange: (c: CidadeOpcao | null, uf: string | null) => void
  placeholder?: string
  className?: string
}) {
  const [lista, setLista] = useState<CidadeOpcao[] | null>(null)
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState("")
  const [ativo, setAtivo] = useState(0)
  const caixaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let vivo = true
    if (!uf) { setLista(null); return }
    setLista(null)
    cidadesDe(uf).then(l => { if (vivo) setLista(l) })
    return () => { vivo = false }
  }, [uf])

  // fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (!caixaRef.current?.contains(e.target as Node)) setAberto(false) }
    document.addEventListener("mousedown", fora)
    return () => document.removeEventListener("mousedown", fora)
  }, [aberto])

  const filtradas = useMemo(() => {
    const t = normalizar(busca)
    const l = lista || []
    if (!t) return l.slice(0, 80)
    const comeca = l.filter(c => normalizar(c.nome).startsWith(t))
    const contem = l.filter(c => !normalizar(c.nome).startsWith(t) && normalizar(c.nome).includes(t))
    return [...comeca, ...contem].slice(0, 80)
  }, [lista, busca])

  const escolher = (c: CidadeOpcao) => {
    onChange(c, c.uf)
    setAberto(false)
    setBusca("")
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <div className="relative w-[80px] shrink-0">
        {/* fechado mostra só a sigla; aberto, a lista mostra o nome do estado */}
        <span className={cn("pointer-events-none absolute left-3 top-2 text-sm font-semibold", !uf && "font-normal text-muted-foreground")}>{uf || "UF"}</span>
        <select
          className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-7 text-sm text-transparent shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          value={uf || ""} title={uf ? NOMES_UF[uf] : "Estado"}
          onChange={e => { onChange(null, e.target.value || null); setBusca(""); if (e.target.value) setTimeout(() => { setAberto(true); inputRef.current?.focus() }, 0) }}>
          <option value="" className="text-foreground">UF</option>
          {UFS_ORDEM.map(u => <option key={u} value={u} className="text-foreground">{u} — {NOMES_UF[u]}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <div ref={caixaRef} className="relative flex-1">
        <div className={cn("flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-xs", aberto && "border-ring ring-2 ring-ring/40", !uf && "opacity-60")}>
          {aberto ? <Search className="h-4 w-4 shrink-0 text-muted-foreground" /> : <MapPin className={cn("h-4 w-4 shrink-0", cidade ? "text-[#d97021]" : "text-muted-foreground")} />}
          <input
            ref={inputRef}
            disabled={!uf}
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder={!uf ? "Escolha o estado primeiro" : cidade ? cidade : placeholder}
            value={aberto ? busca : cidade || ""}
            onFocus={() => { setAberto(true); setBusca(""); setAtivo(0) }}
            onChange={e => { setBusca(e.target.value); setAtivo(0); setAberto(true) }}
            onKeyDown={e => {
              if (e.key === "ArrowDown") { e.preventDefault(); setAtivo(a => Math.min(a + 1, filtradas.length - 1)) }
              else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo(a => Math.max(a - 1, 0)) }
              else if (e.key === "Enter") { e.preventDefault(); if (filtradas[ativo]) escolher(filtradas[ativo]) }
              else if (e.key === "Escape") setAberto(false)
            }}
          />
        </div>
        {aberto && uf && (
          <div className="absolute left-0 right-0 top-10 z-50 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
            {!lista ? <p className="p-2 text-xs text-muted-foreground">Carregando cidades de {NOMES_UF[uf]}...</p>
              : filtradas.length === 0 ? <p className="p-2 text-xs text-muted-foreground">Nenhuma cidade encontrada em {NOMES_UF[uf]}.</p>
              : filtradas.map((c, i) => (
                <button key={c.ibge} type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => escolher(c)}
                  onMouseEnter={() => setAtivo(i)}
                  className={cn("flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm", i === ativo ? "bg-orange-50 text-[#a8541a]" : "hover:bg-muted")}>
                  {c.nome}
                  {cidade && normalizar(cidade) === normalizar(c.nome) && <Check className="h-4 w-4 text-[#d97021]" />}
                </button>
              ))}
            {lista && !busca && lista.length > 80 && <p className="px-2 py-1 text-[11px] text-muted-foreground">{lista.length} cidades — digite para filtrar</p>}
          </div>
        )}
      </div>
    </div>
  )
}
