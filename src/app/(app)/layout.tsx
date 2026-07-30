import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex flex-1 flex-col h-full overflow-hidden relative">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
