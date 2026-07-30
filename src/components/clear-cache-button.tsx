'use client'

import { useRouter } from 'next/navigation'

export function ClearCacheButton() {
  const router = useRouter()

  const handleClearCache = () => {
    // Limpa localStorage e sessionStorage
    localStorage.clear()
    sessionStorage.clear()
    
    // Limpa os cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
    })
    
    // Recarrega a página
    window.location.reload()
  }

  return (
    <button 
      onClick={handleClearCache}
      type="button"
      className="text-sm text-slate-400 hover:text-slate-600 underline underline-offset-4 decoration-slate-300"
    >
      Problemas de acesso? Limpar cache
    </button>
  )
}
