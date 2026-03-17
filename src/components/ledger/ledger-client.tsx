'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { FileText, Download, Images, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface Photo {
  id: string
  storage_path: string
  taken_at: string | null
  description: string | null
  construction_type?: { name: string } | null
  construction_part?: { name: string } | null
}

interface Project {
  id: string
  name: string
  code: string | null
  address: string | null
  start_date: string | null
  end_date: string | null
}

interface Props {
  projects: Project[]
  photos: Photo[]
  initialProjectId?: string
}

export function LedgerClient({ projects, photos, initialProjectId }: Props) {
  const router = useRouter()
  const [selectedProject, setSelectedProject] = useState(initialProjectId ?? '')
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [selectAll, setSelectAll] = useState(false)

  function handleProjectChange(projectId: string | null) {
    if (!projectId) return
    setSelectedProject(projectId)
    setSelectedPhotoIds(new Set())
    setSelectAll(false)
    router.push(`/ledger?project=${projectId}`)
  }

  function togglePhoto(photoId: string) {
    setSelectedPhotoIds(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelectedPhotoIds(new Set())
    } else {
      setSelectedPhotoIds(new Set(photos.map(p => p.id)))
    }
    setSelectAll(!selectAll)
  }

  async function generatePDF() {
    if (!selectedProject) {
      toast.error('プロジェクトを選択してください')
      return
    }

    const targetPhotoIds = selectedPhotoIds.size > 0 ? Array.from(selectedPhotoIds) : undefined

    if (!targetPhotoIds && photos.length === 0) {
      toast.error('確認済みの写真がありません。写真管理で確認・承認してください。')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/ledger/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          photoIds: targetPhotoIds,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'PDF生成に失敗しました')
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDFを生成しました')
    } catch (err) {
      toast.error(String(err))
    } finally {
      setGenerating(false)
    }
  }

  const selectedProject_ = projects.find(p => p.id === selectedProject)
  const targetCount = selectedPhotoIds.size > 0 ? selectedPhotoIds.size : photos.length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">台帳出力</h1>
        <p className="text-gray-500 mt-1">工事写真台帳をPDFで出力します</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 左側：設定 */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">出力設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>プロジェクト選択</Label>
                <Select value={selectedProject} onValueChange={handleProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="プロジェクトを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedProject_ && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-medium text-gray-700">{selectedProject_.name}</p>
                  {selectedProject_.code && <p className="text-gray-500">{selectedProject_.code}</p>}
                  {selectedProject_.address && <p className="text-gray-500">{selectedProject_.address}</p>}
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Images className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">出力対象</span>
                </div>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>確認済み写真: {photos.length}枚</p>
                  {selectedPhotoIds.size > 0 && (
                    <p className="text-orange-600">選択中: {selectedPhotoIds.size}枚</p>
                  )}
                </div>
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={generatePDF}
                disabled={!selectedProject || generating || photos.length === 0}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />生成中...</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" />PDF出力 ({targetCount}枚)</>
                )}
              </Button>

              {photos.length === 0 && selectedProject && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      確認済みの写真がありません。写真管理で写真を確認してください。
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右側：写真一覧 */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">確認済み写真一覧</CardTitle>
                <CardDescription>チェックして選択、または全て出力</CardDescription>
              </div>
              {photos.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={toggleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm cursor-pointer">全選択</Label>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedProject ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>プロジェクトを選択してください</p>
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Images className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>確認済みの写真がありません</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${
                        selectedPhotoIds.has(photo.id)
                          ? 'border-orange-400 ring-2 ring-orange-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => togglePhoto(photo.id)}
                    >
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <Images className="h-8 w-8 text-gray-300" />
                      </div>
                      {selectedPhotoIds.has(photo.id) && (
                        <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8 text-orange-500" />
                        </div>
                      )}
                      <div className="p-1.5">
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {photo.construction_type?.name ?? '未設定'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {photo.construction_part?.name ?? ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
