"use client"

import { Search, Moon, Settings } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between bg-[#d97021] px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Aqui podemos colocar um título de sessão ou breadcrumb futuramente. O "ARCOFORTE" fica para combinar com o design, ou deixamos na Sidebar */}
        <span className="text-white font-bold tracking-widest text-sm">
          ARCOFORTE
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-white/70" />
          <input
            type="search"
            placeholder="Busca rápida..."
            className="h-8 w-64 rounded-md bg-black/10 pl-9 pr-4 text-sm text-white placeholder:text-white/70 focus:bg-white focus:text-slate-900 focus:outline-none transition-colors"
          />
        </div>
        
        <button className="text-white/80 hover:text-white transition-colors">
          <Moon className="h-5 w-5" />
        </button>
        <button className="text-white/80 hover:text-white transition-colors">
          <Settings className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
