"use client"

import { useState } from "react"
import { Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export type OpcaoOrcamento3D = { id: string; rotulo: string; hash: string }

export function Estufa3DViewer({ opcoes, inicialId }: { opcoes: OpcaoOrcamento3D[]; inicialId: string }) {
  const [selecionado, setSelecionado] = useState(inicialId)
  const hash = opcoes.find(o => o.id === selecionado)?.hash || ""
  const src = "/api/estufa3d" + hash

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <label htmlFor="orc3d" className="text-sm font-medium whitespace-nowrap">Medidas do orçamento:</label>
        <select
          id="orc3d"
          value={selecionado}
          onChange={e => setSelecionado(e.target.value)}
          className="h-9 w-full sm:max-w-xl rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Montar livremente (sem orçamento)</option>
          {opcoes.map(o => (
            <option key={o.id} value={o.id}>{o.rotulo}</option>
          ))}
        </select>
        <Button variant="outline" className="gap-2 sm:ml-auto" onClick={() => window.open(src, "_blank")}>
          <Maximize2 className="h-4 w-4" /> Abrir em outra aba
        </Button>
      </div>
      <div className="rounded-xl border overflow-hidden bg-white" style={{ height: "calc(100vh - 210px)", minHeight: 520 }}>
        <iframe
          key={src}
          src={src}
          title="Estufa 3D"
          className="w-full h-full border-0"
          allow="fullscreen"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        O 3D é só para visualizar a ideia da estufa com o cliente. Medidas, perfis e materiais finais seguem o orçamento.
      </p>
    </div>
  )
}
