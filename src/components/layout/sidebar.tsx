"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tractor, Home, Users, Package, Settings, LogOut, FileText, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Painel", href: "/", icon: Home },
  { name: "Orçamentos", href: "/orcamentos", icon: FileText },
  { name: "Clientes", href: "/clientes", icon: Users },
  { name: "Produtos", href: "/produtos", icon: Package },
  { name: "Analisador PDF", href: "/analisador", icon: Search },
  { name: "Regras de Montagem", href: "/admin/regras", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-72 flex-col border-r border-slate-200 bg-white/70 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40">
      <div className="flex flex-col items-center justify-center border-b border-slate-100 px-4 py-8 bg-gradient-to-b from-slate-50/50 to-transparent">
        <div className="w-24 h-16 flex items-center justify-center rounded-xl mb-3">
          {/* Se a imagem ainda não existir, o alt text vai aparecer ou ficar em branco, basta colocar a imagem real em public/logo.png */}
          <img src="/logo.png" alt="Logo ArcoForte" className="max-w-full max-h-full object-contain" />
        </div>
        <span className="font-black text-base tracking-tight text-slate-800">ARCOFORTE</span>
        <span className="text-[10px] text-primary uppercase tracking-widest mt-0.5 font-bold">Orçamento</span>
      </div>
      
      <div className="flex-1 overflow-auto py-6">
        <nav className="grid gap-1.5 px-4 text-sm font-medium">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                  isActive 
                    ? "bg-[#d97021] text-white shadow-md shadow-orange-500/20" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-slate-100 bg-white">
        <div className="flex items-center gap-3 mb-4 px-2 py-2 rounded-xl bg-slate-50 border border-slate-100">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-[#ff8c42] flex items-center justify-center text-white shadow-sm">
            <span className="font-bold text-xs">BR</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 leading-tight">Bruno</span>
            <span className="text-[10px] text-primary font-bold">ADMINISTRADOR</span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          onClick={async () => {
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            await supabase.auth.signOut()
            window.location.href = '/login'
          }}
        >
          <LogOut className="h-4 w-4" />
          Desconectar
        </Button>
        <div className="mt-3 text-center">
          <span className="text-[10px] text-slate-400 font-medium">v0.1.0</span>
        </div>
      </div>
    </div>
  )
}
