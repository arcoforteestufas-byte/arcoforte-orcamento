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
    <div className="flex h-full w-64 flex-col border-r bg-white shadow-sm z-40">
      <div className="flex flex-col items-center justify-center border-b border-slate-100 px-4 py-8">
        {/* Espaço reservado para a logo */}
        <div className="w-16 h-12 bg-slate-50 flex items-center justify-center rounded-md mb-3 border border-slate-100">
          <Tractor className="h-6 w-6 text-slate-300" />
        </div>
        <span className="font-black text-sm tracking-tight text-slate-900">ARCOFORTE</span>
        <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Orçamento</span>
      </div>
      
      <div className="flex-1 overflow-auto py-6">
        <nav className="grid gap-1 px-4 text-sm font-medium">
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
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-white shadow-sm">
            <span className="text-slate-600 font-bold text-xs">BR</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700">Bruno</span>
            <span className="text-[10px] text-[#d97021] font-bold">ADMIN</span>
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
      </div>
    </div>
  )
}
