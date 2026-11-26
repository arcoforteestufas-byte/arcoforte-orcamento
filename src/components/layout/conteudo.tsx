"use client"

import { usePathname } from "next/navigation"

// Telas que usam a largura toda do monitor (ex.: o quadro kanban do CRM).
// As demais ficam centralizadas com largura máxima, para leitura confortável.
const TELA_CHEIA = ["/crm"]

export function Conteudo({ children }: { children: React.ReactNode }) {
  const caminho = usePathname()
  const cheia = TELA_CHEIA.includes(caminho)
  return <div className={cheia ? "w-full" : "max-w-7xl mx-auto"}>{children}</div>
}
