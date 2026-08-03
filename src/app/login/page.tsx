import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react"
import { login } from "./actions"
import Link from "next/link"
import { ClearCacheButton } from "@/components/clear-cache-button"
import { createClient } from "@/utils/supabase/server"
import Image from "next/image"

type Props = {
  searchParams: Promise<{ message?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { message } = await searchParams;
  
  const supabase = await createClient()
  const { data: config } = await supabase.from('configuracoes').select('logo_url').limit(1).single()

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 relative">
      <div className="mx-auto grid w-full max-w-[450px] gap-8 bg-white border border-slate-100 p-10 sm:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-10">
        
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center justify-center mb-2">
            {config?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <div className="bg-[#fff3eb] p-3 rounded-2xl">
                <LogIn className="h-6 w-6 text-[#d97021]" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Bem-vindo de volta</h2>
            <p className="text-sm text-slate-500 mt-1">
              Digite suas credenciais para acessar
            </p>
          </div>
        </div>

        {message && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-medium text-center shadow-sm">
            🚨 {message}
          </div>
        )}

        <form action={login} className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Email Corporativo
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <Input
                name="email"
                id="email"
                type="email"
                placeholder="seuemail@arcoforte.com.br"
                required
                className="pl-10 bg-slate-50 border-transparent focus:bg-white focus:border-[#d97021] focus:ring-[#d97021] h-11 rounded-xl"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Senha
              </Label>
              <Link href="#" className="text-xs font-medium text-[#d97021] hover:underline">
                Esqueceu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              <Input 
                name="password" 
                id="password" 
                type="password" 
                placeholder="••••••••"
                required 
                className="pl-10 bg-slate-50 border-transparent focus:bg-white focus:border-[#d97021] focus:ring-[#d97021] h-11 rounded-xl"
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full h-12 rounded-xl bg-[#d97021] hover:bg-[#c3631b] text-white font-medium text-base gap-2 mt-2 shadow-md shadow-orange-500/20">
            Acessar Sistema
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="grid gap-3 pt-6 border-t border-slate-100 text-center">
          <ClearCacheButton />
        </div>
      </div>
      
      <div className="absolute bottom-6 w-full text-center">
        <p className="text-xs text-slate-400">
          © 2026 ArcoForte Orçamento, Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
