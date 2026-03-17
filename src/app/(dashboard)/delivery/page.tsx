'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Package, Download, CheckCircle2, XCircle, AlertCircle, Loader2,
  FileText, Images, Calendar
} from 'lucide-react'

export default function DeliveryPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<{ id: string; name: string; code: string | null }[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [projectInfo, setProjectInfo] = useState<{
    name: string; photoCount: number; confirmedCount: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [validationResults, setValidationResults] = useState<{
    passed: boolean; items: { label: string; ok: boolean; message: string }[]
  } | null>(null)

  useEffect(() => {
    supabase.from('projects').select('id, name, code').order('created_at', { ascending: false })
      .then(({ data }) => setProjects(data ?? []))
  }, [])

  async function loadProjectInfo(projectId: string | null) {
    if (!projectId) return
    setLoading(true)
    setValidationResults(null)

    const [{ count: total }, { count: confirmed }, { data: project }] = await Promise.all([
      supabase.from('photos').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
      supabase.from('photos').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'confirmed'),
      supabase.from('projects').select('*').eq('id', projectId).single(),
    ])

    // バリデーション
    const items = [
      {
        label: '確認済み写真',
        ok: (confirmed ?? 0) > 0,
        message: confirmed ? `${confirmed}枚の確認済み写真があります` : '確認済みの写真がありません',
      },
      {
        label: '工事名設定',
        ok: !!project?.name,
        message: project?.name ? `工事名: ${project.name}` : '工事名が未設定です',
      },
      {
        label: '工事場所設定',
        ok: !!project?.address,
        message: project?.address ? `場所: ${project.address}` : '工事場所が未設定です（任意）',
      },
      {
        label: '工期設定',
        ok: !!(project?.start_date && project?.end_date),
        message: (project?.start_date && project?.end_date)
          ? `${project.start_date} 〜 ${project.end_date}`
          : '工期が未設定です（任意）',
      },
    ]

    setProjectInfo({
      name: project?.name ?? '',
      photoCount: total ?? 0,
      confirmedCount: confirmed ?? 0,
    })
    setValidationResults({
      passed: items.filter(i => !i.ok).every(i => !['確認済み写真', '工事名設定'].includes(i.label)),
      items,
    })
    setLoading(false)
  }

  async function exportDelivery() {
    if (!selectedProject) return
    setExporting(true)
    try {
      const res = await fetch('/api/delivery/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `delivery_${new Date().toISOString().split('T')[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('電子納品データを出力しました')
    } catch (err) {
      toast.error(String(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">電子納品出力</h1>
        <p className="text-gray-500 mt-1">国土交通省電子納品要領（PHOTOフォルダ）準拠のZIPを生成します</p>
      </div>

      <div className="space-y-6">
        {/* プロジェクト選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">プロジェクト選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedProject}
              onValueChange={(v) => { setSelectedProject(v ?? ''); loadProjectInfo(v ?? '') }}
            >
              <SelectTrigger>
                <SelectValue placeholder="プロジェクトを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {loading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                情報を読み込み中...
              </div>
            )}

            {projectInfo && !loading && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{projectInfo.photoCount}</p>
                  <p className="text-xs text-gray-500">総写真枚数</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{projectInfo.confirmedCount}</p>
                  <p className="text-xs text-gray-500">確認済み</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {projectInfo.photoCount - projectInfo.confirmedCount}
                  </p>
                  <p className="text-xs text-gray-500">未確認</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* バリデーション結果 */}
        {validationResults && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                納品前チェック
                {validationResults.passed
                  ? <Badge className="bg-green-100 text-green-700">合格</Badge>
                  : <Badge className="bg-red-100 text-red-700">要確認</Badge>
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {validationResults.items.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                    {item.ok
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      : <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    }
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 出力内容説明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">出力内容</CardTitle>
            <CardDescription>ZIPファイルの構成</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm bg-gray-50 rounded-lg p-4 space-y-1">
              <p className="text-gray-700">📦 delivery_YYYYMMDD.zip</p>
              <p className="text-gray-600 pl-4">📄 INDEX_C.XML（工事管理ファイル）</p>
              <p className="text-gray-600 pl-4">📁 PHOTO/</p>
              <p className="text-gray-500 pl-8">🖼 P0001.jpg</p>
              <p className="text-gray-500 pl-8">🖼 P0002.jpg</p>
              <p className="text-gray-500 pl-8">...</p>
              <p className="text-gray-600 pl-8">📄 PHOTO.XML（写真情報ファイル）</p>
            </div>
          </CardContent>
        </Card>

        {/* エクスポートボタン */}
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base"
          onClick={exportDelivery}
          disabled={!selectedProject || exporting || (projectInfo?.confirmedCount ?? 0) === 0}
        >
          {exporting ? (
            <><Loader2 className="h-5 w-5 mr-2 animate-spin" />生成中...</>
          ) : (
            <><Download className="h-5 w-5 mr-2" />電子納品データをダウンロード</>
          )}
        </Button>
      </div>
    </div>
  )
}
