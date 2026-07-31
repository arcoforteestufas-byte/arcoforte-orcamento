import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { ChatWidget } from "@/components/chat-widget"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex flex-1 flex-col h-full overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay z-0" />
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 z-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <ChatWidget />
    </div>
  )
}
