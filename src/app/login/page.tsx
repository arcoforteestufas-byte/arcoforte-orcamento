import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react"
import { login } from "./actions"
import Link from "next/link"
import { ClearCacheButton } from "@/components/clear-cache-button"

export default function LoginPage() {
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      
      {/* Lado Esquerdo - Fundo Laranja ArcoForte */}
      <div className="hidden bg-[#d97021] lg:flex flex-col justify-center px-16 xl:px-24 text-white relative">
        <div className="max-w-md space-y-6">
          <div className="bg-white text-[#d97021] font-bold text-xl px-6 py-2 rounded-xl inline-block mb-6 shadow-sm">
            ARCO<br/><span className="text-sm font-medium">ORÇAMENTO</span>
          </div>
          <h1 className="text-3xl font-bold">
            Gere orçamentos com excelência.
          </h1>
          <p className="text-white/90 text-lg leading-relaxed">
            O ArcoForte Orçamento oferece as ferramentas que você precisa
            para calcular projetos reais de estufas. Simples,
            rápido e eficiente.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário Branco */}
      <div className="flex items-center justify-center py-12 bg-white">
        <div className="mx-auto grid w-[450px] gap-8 bg-white border border-slate-100 p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="bg-[#fff3eb] p-3 rounded-2xl">
              <LogIn className="h-6 w-6 text-[#d97021]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Bem-vindo de volta</h2>
              <p className="text-sm text-slate-500 mt-1">
                Digite suas credenciais para acessar
              </p>
            </div>
          </div>

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
        
        <div className="absolute bottom-6 right-0 left-0 lg:left-1/2 text-center">
          <p className="text-xs text-slate-400">
            © 2026 ArcoForte Orçamento, Todos os direitos reservados.
          </p>
        </div>
      </div>

    </div>
  )
}
