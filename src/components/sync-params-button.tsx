"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { DownloadCloud } from "lucide-react"
import { seedParametrosFromMD } from "@/app/actions/sync-parametros"

export function SyncParamsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      const result = await seedParametrosFromMD(formData)
      if (result.success) {
        alert(result.message)
      } else {
        alert("Erro: " + result.error)
      }
    } catch (err: any) {
      alert("Erro fatal: " + err.message)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input 
        type="file" 
        accept=".md" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <Button 
        variant="outline" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="gap-2 border-[#16a34a] text-[#16a34a] hover:bg-[#dcfce7]"
      >
        <DownloadCloud className="h-4 w-4" />
        {isLoading ? "Processando..." : "Carregar MD"}
      </Button>
    </>
  )
}

