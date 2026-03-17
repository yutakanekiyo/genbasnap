'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BigButton } from '@/components/ui/BigButton'
import { LargeSelector } from '@/components/ui/LargeSelector'
import { FileText, Package, Download, ChevronRight, Loader2 } from 'lucide-react'
import { useEffect } from 'react'

type Mode = null | 'ledger' | 'delivery'

export default function LedgerPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>(null)
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [photoCount, setPhotoCount] = useState(0)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    supabase.from('projects').select('id, name').order('created_at', { ascending: false })
      .then(({ data }) => setProjects(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedProject) return
    supabase.from('photos').select('*', { count: 'exact', head: true })
      .eq('project_id', selectedProject).eq('status', 'confirmed')
      .then(({ count }) => setPhotoCount(count ?? 0))
  }, [selectedProject])

  async function generateLedger() {
    if (!selectedProject) { toast.error('現場を選んでください'); return }
    if (photoCount === 0) { toast.error('確認済みの写真がありません。先に写真を確認してください'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/ledger/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject }),
      })
      if (!res.ok) throw new Error('台帳の作成に失敗しました')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `台帳_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('台帳ができました！')
    } catch {
      toast.error('台帳の作成に失敗しました。もう一度お試しください')
    } finally {
      setGenerating(false)
    }
  }

  async function generateDelivery() {
    if (!selectedProject) { toast.error('現場を選んでください'); return }
    if (photoCount === 0) { toast.error('確認済みの写真がありません。先に写真を確認してください'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/delivery/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject }),
      })
      if (!res.ok) throw new Error('データの作成に失敗しました')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `電子納品_${new Date().toISOString().split('T')[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('電子納品データができました！')
    } catch {
      toast.error('データの作成に失敗しました。もう一度お試しください')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <p className="text-2xl font-bold text-gray-900">台帳をつくる</p>

      {/* モード選択 */}
      {!mode && (
        <div className="space-y-4">
          <button onClick={() => setMode('ledger')} className="w-full bg-white rounded-2xl p-5 border-2 border-gray-100 flex items-center gap-4 active:bg-gray-50 shadow-sm">
            <div className="bg-blue-100 rounded-2xl p-3">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-lg font-bold text-gray-900">写真台帳をつくる</p>
              <p className="text-sm text-gray-500 mt-0.5">印刷用・報告用</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          <button onClick={() => setMode('delivery')} className="w-full bg-white rounded-2xl p-5 border-2 border-gray-100 flex items-center gap-4 active:bg-gray-50 shadow-sm">
            <div className="bg-purple-100 rounded-2xl p-3">
              <Package className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-lg font-bold text-gray-900">電子納品データをつくる</p>
              <p className="text-sm text-gray-500 mt-0.5">役所に提出用</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </div>
      )}

      {/* 台帳 or 電子納品フロー */}
      {mode && (
        <div className="space-y-5">
          <button onClick={() => setMode(null)} className="text-blue-600 font-medium text-base flex items-center gap-1">
            ← もどる
          </button>

          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-base font-bold text-blue-800">
              {mode === 'ledger' ? '写真台帳をつくります' : '電子納品データをつくります'}
            </p>
            <p className="text-sm text-blue-600 mt-1">確認済みの写真が対象です</p>
          </div>

          <LargeSelector
            label="現場を選ぶ"
            options={projects}
            value={selectedProject}
            onChange={(id) => setSelectedProject(id)}
            placeholder="現場を選んでください"
          />

          {selectedProject && (
            <div className={`rounded-2xl p-4 ${photoCount > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
              <p className={`text-base font-bold ${photoCount > 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                {photoCount > 0 ? `✓ 確認済みの写真が${photoCount}枚あります` : '⚠️ 確認済みの写真がありません'}
              </p>
              {photoCount === 0 && (
                <p className="text-sm text-yellow-700 mt-1">写真一覧で写真を確認してから作成してください</p>
              )}
            </div>
          )}

          <BigButton
            onClick={mode === 'ledger' ? generateLedger : generateDelivery}
            loading={generating}
            loadingText="つくっています..."
            disabled={!selectedProject || photoCount === 0}
          >
            <Download className="h-5 w-5" />
            {mode === 'ledger' ? 'この内容で台帳をつくる' : '電子納品データをつくる'}
          </BigButton>
        </div>
      )}
    </div>
  )
}
