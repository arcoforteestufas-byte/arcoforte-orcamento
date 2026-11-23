"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Shield, ShieldAlert, Trash2, Edit, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, FotoPerfil } from "@/components/foto-perfil"

type User = {
  id: string
  email: string
  user_metadata: {
    nome?: string
    cargo?: string
    telefone?: string
    foto_url?: string | null
  }
  crm_ver_todos?: boolean
  crm_editar_todos?: boolean
}

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', password: '', nome: '', cargo: 'Visualizador', telefone: '', foto_url: null as string | null, crm_ver_todos: false, crm_editar_todos: false })

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenNew = () => {
    setEditingId(null)
    setForm({ email: '', password: '', nome: '', cargo: 'Visualizador', telefone: '', foto_url: null, crm_ver_todos: false, crm_editar_todos: false })
    setIsOpen(true)
  }

  const handleOpenEdit = (user: User) => {
    setEditingId(user.id)
    setForm({ 
      email: user.email, 
      password: '', // blank on edit
      nome: user.user_metadata?.nome || '', 
      cargo: user.user_metadata?.cargo || 'Visualizador',
      telefone: user.user_metadata?.telefone || '',
      foto_url: user.user_metadata?.foto_url || null,
      crm_ver_todos: !!user.crm_ver_todos,
      crm_editar_todos: !!user.crm_editar_todos
    })
    setIsOpen(true)
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '')
    if (value.length > 11) value = value.slice(0, 11)

    let formatted = value
    if (value.length > 2) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`
    }
    if (value.length > 7) {
      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`
    }
    
    setForm({ ...form, telefone: formatted })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const payload = editingId ? { id: editingId, ...form } : form
      
      const res = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setIsOpen(false)
        await fetchUsers()
      } else {
        const err = await res.json()
        alert('Erro: ' + err.error)
      }
    } catch (e) {
      alert('Erro inesperado')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário permanentemente?')) return
    
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchUsers()
      } else {
        alert('Erro ao excluir')
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Gerenciamento de Equipe</CardTitle>
          <CardDescription>Adicione, edite cargos ou remova usuários do sistema.</CardDescription>
        </div>
        <Button onClick={handleOpenNew} className="gap-2">
          <Plus size={16} /> Novo Usuário
        </Button>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="rounded-md border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nome / Email</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nome={u.user_metadata?.nome || u.email} foto={u.user_metadata?.foto_url} className="h-9 w-9" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900">{u.user_metadata?.nome || 'Sem nome'}</div>
                          <div className="text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        u.user_metadata?.cargo === 'Administrador' ? 'border-primary text-primary bg-primary/5' : 
                        u.user_metadata?.cargo === 'Vendedor' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                        u.user_metadata?.cargo === 'Logística' ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                        u.user_metadata?.cargo === 'Expedição' ? 'border-violet-500 text-violet-700 bg-violet-50' : 'bg-slate-50'
                      }>
                        {u.user_metadata?.cargo === 'Administrador' && <ShieldAlert size={12} className="mr-1" />}
                        {u.user_metadata?.cargo === 'Vendedor' && <Shield size={12} className="mr-1" />}
                        {u.user_metadata?.cargo || 'Visualizador'}
                      </Badge>
                      {u.user_metadata?.cargo === 'Vendedor' && (
                        <div className="mt-1 text-[11px] text-slate-500">
                          CRM: {u.crm_ver_todos ? (u.crm_editar_todos ? 'vê e edita todos os leads' : 'vê todos os leads') : 'só os próprios leads'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(u)} className="h-8 w-8 text-slate-500 hover:text-blue-600">
                        <Edit size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="h-8 w-8 text-slate-500 hover:text-red-600">
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-slate-500">Nenhum usuário cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Altere as informações ou senha do usuário.' : 'Crie um novo acesso para a equipe.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FotoPerfil nome={form.nome || form.email} foto={form.foto_url} tipo="usuario" onChange={url => setForm(f => ({ ...f, foto_url: url }))} />
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="João Silva" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" type="tel" value={form.telefone} onChange={handleTelefoneChange} placeholder="(00) 00000-0000" />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!!editingId} placeholder="joao@empresa.com" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Senha {editingId && <span className="text-slate-400 text-xs font-normal">(deixe em branco para não alterar)</span>}</Label>
              <Input id="password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingId ? '********' : 'Digite uma senha segura'} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cargo">Cargo / Nível de Acesso</Label>
              <Select value={form.cargo} onValueChange={v => setForm({...form, cargo: v as 'admin' | 'vendedor'})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador">Administrador (Acesso Total)</SelectItem>
                  <SelectItem value="Vendedor">Vendedor (Pode criar orçamentos)</SelectItem>
                  <SelectItem value="Logística">Logística (Programa entregas e viagens)</SelectItem>
                  <SelectItem value="Expedição">Expedição (Separa e confere a carga no galpão)</SelectItem>
                  <SelectItem value="Visualizador">Visualizador (Apenas consulta)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.cargo === 'Vendedor' && (
              <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Leads no CRM</div>
                <p className="text-xs text-slate-500">Por padrão o vendedor vê só os leads dele. Entregas, ele vê todas.</p>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#d97021]" checked={form.crm_ver_todos}
                    onChange={e => setForm(f => ({ ...f, crm_ver_todos: e.target.checked, crm_editar_todos: e.target.checked ? f.crm_editar_todos : false }))} />
                  <span>Liberar para ver os leads de todos os vendedores</span>
                </label>
                <label className={`flex items-start gap-2 text-sm ${form.crm_ver_todos ? '' : 'opacity-50'}`}>
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#d97021]" disabled={!form.crm_ver_todos} checked={form.crm_editar_todos}
                    onChange={e => setForm(f => ({ ...f, crm_editar_todos: e.target.checked }))} />
                  <span>Também pode editar os leads dos outros</span>
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Salvar Alterações' : 'Criar Conta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
