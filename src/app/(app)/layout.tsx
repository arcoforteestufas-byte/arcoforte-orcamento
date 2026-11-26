import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { ChatWidget } from "@/components/chat-widget"
import { Conteudo } from "@/components/layout/conteudo"
import { SettingsProvider } from "@/contexts/SettingsContext"

import { createClient } from "@/utils/supabase/server"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <SettingsProvider>
      <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
        <div className="hidden md:block">
        <Sidebar user={user} />
      </div>
      
      <div className="flex flex-1 flex-col h-full overflow-hidden relative">
        <Header user={user} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 z-10">
          <Conteudo>{children}</Conteudo>
        </main>
      </div>

      <ChatWidget />
    </div>
    </SettingsProvider>
  )
}
