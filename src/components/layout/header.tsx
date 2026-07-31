"use client"

import { Search, Moon, Settings, Menu, X } from "lucide-react"
import { useState } from "react"
import { Sidebar } from "./sidebar"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between bg-[#d97021] px-4 sm:px-6 shadow-sm border-b border-[#d97021]">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden text-white hover:text-white/80 transition-colors p-1"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <span className="text-white font-black tracking-widest text-sm hidden sm:block md:hidden">
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
          
          <button className="text-white/80 hover:text-white transition-colors bg-black/10 p-2 rounded-full">
            <Moon className="h-4 w-4" />
          </button>
          <button className="text-white/80 hover:text-white transition-colors bg-black/10 p-2 rounded-full">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-72 max-w-[80%] flex-col bg-white shadow-xl animate-in slide-in-from-left-4 duration-300">
            <button 
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-800 z-50 p-1 bg-white/50 rounded-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}
    </>
  )
}
