'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BigButton } from '@/components/ui/BigButton'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export function CreateProjectDialog({ fab = false }: { fab?: boolean }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    start_date: '',
    end_date: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('ログイン情報の取得に失敗しました'); setLoading(false); return }

    const { data: userData } = await supabase.from('users').select('org_id').eq('id', user.id).single()
    if (!userData) { toast.error('ユーザー情報の取得に失敗しました'); setLoading(false); return }

    const { error } = await supabase.from('projects').insert({
      org_id: userData.org_id,
      name: form.name,
      code: form.code || null,
      address: form.address || null,
      status: 'active',
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })

    if (error) {
      toast.error('現場の作成に失敗しました')
    } else {
      toast.success('現場を登録しました')
      setOpen(false)
      setForm({ name: '', code: '', address: '', start_date: '', end_date: '' })
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      {fab ? (
        <button
          onClick={() => setOpen(true)}
          className="w-16 h-16 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-300 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="h-8 w-8" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white rounded-xl px-4 py-2.5 flex items-center gap-1.5 text-base font-bold"
        >
          <Plus className="h-5 w-5" />
          現場を登録
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">現場を登録する</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base font-bold">現場名 *</Label>
              <Input
                id="name"
                placeholder="○○マンション新築工事"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code" className="text-base font-bold">工事番号</Label>
              <Input
                id="code"
                placeholder="R06-001"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className="text-base font-bold">現場の住所</Label>
              <Input
                id="address"
                placeholder="東京都○○区..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-12 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-base font-bold">着工日</Label>
                <Input id="start_date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-base font-bold">竣工日</Label>
                <Input id="end_date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="h-12 text-base" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-14 rounded-xl border-2 border-gray-200 text-base font-bold text-gray-600">
                やめる
              </button>
              <BigButton type="submit" loading={loading} loadingText="登録中..." className="flex-1">
                登録する
              </BigButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
