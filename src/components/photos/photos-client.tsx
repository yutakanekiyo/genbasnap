'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { PhotoUploader } from './photo-uploader'
import {
  Images,
  Filter,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  Sparkles,
  Edit2,
  Check,
} from 'lucide-react'
import type { Photo, ConstructionType } from '@/types'

interface Props {
  photos: (Photo & { public_url: string })[]
  projects: { id: string; name: string }[]
  constructionTypes: (ConstructionType & { construction_parts: { id: string; name: string }[] })[]
  initialProjectId?: string
  initialStatus?: string
}

const statusConfig = {
  pending: { label: 'AI解析待ち', icon: Clock, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  analyzed: { label: 'AI解析済み', icon: Sparkles, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  confirmed: { label: '確認済み', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
}

export function PhotosClient({ photos, projects, constructionTypes, initialProjectId, initialStatus }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedProject, setSelectedProject] = useState(initialProjectId ?? '')
  const [selectedStatus, setSelectedStatus] = useState(initialStatus ?? '')
  const [selectedPhoto, setSelectedPhoto] = useState<(Photo & { public_url: string }) | null>(null)
  const [editDescription, setEditDescription] = useState('')
  const [editTypeId, setEditTypeId] = useState('')
  const [editPartId, setEditPartId] = useState('')
  const [saving, setSaving] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  function applyFilters(projectId: string, status: string) {
    const params = new URLSearchParams()
    if (projectId) params.set('project', projectId)
    if (status) params.set('status', status)
    router.push(`/photos?${params.toString()}`)
  }

  function openPhoto(photo: Photo & { public_url: string }) {
    setSelectedPhoto(photo)
    setEditDescription(photo.description ?? '')
    setEditTypeId(photo.type_id ?? '')
    setEditPartId(photo.part_id ?? '')
  }

  async function savePhoto() {
    if (!selectedPhoto) return
    setSaving(true)

    const { error } = await supabase
      .from('photos')
      .update({
        description: editDescription,
        type_id: editTypeId || null,
        part_id: editPartId || null,
        status: 'confirmed',
      })
      .eq('id', selectedPhoto.id)

    if (error) {
      toast.error('保存に失敗しました')
    } else {
      toast.success('写真情報を保存しました')
      setSelectedPhoto(null)
      router.refresh()
    }
    setSaving(false)
  }

  const selectedType = constructionTypes.find(t => t.id === editTypeId)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">写真管理</h1>
          <p className="text-gray-500 mt-1">{photos.length}枚の写真</p>
        </div>
        <Sheet open={showUpload} onOpenChange={setShowUpload}>
          <SheetTrigger render={<Button className="bg-orange-500 hover:bg-orange-600"><Upload className="h-4 w-4 mr-1" />写真アップロード</Button>} />
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>写真アップロード</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              {/* プロジェクト選択 */}
              <div className="space-y-2">
                <Label>プロジェクト</Label>
                <Select value={selectedProject} onValueChange={(v) => setSelectedProject(v ?? '')}>
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
              {selectedProject && (
                <PhotoUploader
                  projectId={selectedProject}
                  constructionTypes={constructionTypes}
                  onSuccess={() => setShowUpload(false)}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-white rounded-xl border">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">フィルタ:</span>
        </div>
        <Select
          value={selectedProject}
          onValueChange={(v) => {
            setSelectedProject(v ?? '')
            applyFilters(v ?? '', selectedStatus)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="全プロジェクト" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全プロジェクト</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedStatus}
          onValueChange={(v) => {
            setSelectedStatus(v ?? '')
            applyFilters(selectedProject, v ?? '')
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="全ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">全ステータス</SelectItem>
            <SelectItem value="pending">AI解析待ち</SelectItem>
            <SelectItem value="analyzed">AI解析済み</SelectItem>
            <SelectItem value="confirmed">確認済み</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 写真グリッド */}
      {photos.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Images className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">写真がありません</p>
          <p className="text-sm mt-2">写真をアップロードしてください</p>
          <Button
            className="mt-4 bg-orange-500 hover:bg-orange-600"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            アップロード
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo) => {
            const status = statusConfig[photo.status] ?? statusConfig.pending
            const StatusIcon = status.icon
            return (
              <div
                key={photo.id}
                className="cursor-pointer rounded-xl overflow-hidden border bg-white hover:shadow-md transition-shadow"
                onClick={() => openPhoto(photo)}
              >
                <div className="aspect-square relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.public_url}
                    alt={photo.original_filename ?? '写真'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 right-1.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border ${status.color}`}>
                      <StatusIcon className="h-3 w-3" />
                    </span>
                  </div>
                </div>
                <div className="p-2">
                  {photo.construction_type && (
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {photo.construction_type.name}
                    </p>
                  )}
                  {photo.construction_part && (
                    <p className="text-xs text-gray-500 truncate">{photo.construction_part.name}</p>
                  )}
                  {photo.taken_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(photo.taken_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 写真詳細ダイアログ */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>写真の確認・編集</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* 写真 */}
                <div className="rounded-lg overflow-hidden border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedPhoto.public_url}
                    alt="写真"
                    className="w-full max-h-64 object-contain bg-gray-100"
                  />
                </div>

                {/* AI解析結果バナー */}
                {selectedPhoto.status === 'analyzed' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700">
                      AIが自動で工種・部位・説明文を提案しました。内容を確認・修正してください。
                    </p>
                  </div>
                )}

                {/* 黒板OCR結果 */}
                {selectedPhoto.ai_analysis?.blackboard?.detected && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-700 mb-2">黒板OCR読み取り結果</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-amber-900">
                      {Object.entries(selectedPhoto.ai_analysis.blackboard.fields ?? {}).map(([k, v]) =>
                        v ? <div key={k}><span className="text-amber-600">{k}:</span> {String(v)}</div> : null
                      )}
                    </div>
                  </div>
                )}

                {/* 工種・部位 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>工種</Label>
                    <Select value={editTypeId} onValueChange={(v) => { setEditTypeId(v ?? ''); setEditPartId('') }}>
                      <SelectTrigger>
                        <SelectValue placeholder="工種を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">未選択</SelectItem>
                        {constructionTypes.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPhoto.ai_analysis?.construction_type && (
                      <p className="text-xs text-blue-600">
                        AI提案: {selectedPhoto.ai_analysis.construction_type.name}
                        （信頼度 {Math.round((selectedPhoto.ai_analysis.construction_type.confidence ?? 0) * 100)}%）
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>部位</Label>
                    <Select value={editPartId} onValueChange={(v) => setEditPartId(v ?? '')} disabled={!editTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="部位を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">未選択</SelectItem>
                        {selectedType?.construction_parts?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedPhoto.ai_analysis?.construction_part && (
                      <p className="text-xs text-blue-600">
                        AI提案: {selectedPhoto.ai_analysis.construction_part.name}
                        （信頼度 {Math.round((selectedPhoto.ai_analysis.construction_part.confidence ?? 0) * 100)}%）
                      </p>
                    )}
                  </div>
                </div>

                {/* 説明文 */}
                <div className="space-y-2">
                  <Label>説明文</Label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="工事写真の説明文を入力してください"
                    rows={3}
                  />
                </div>

                {/* メタデータ */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {selectedPhoto.taken_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(selectedPhoto.taken_at).toLocaleString('ja-JP')}
                    </span>
                  )}
                  {selectedPhoto.lat && selectedPhoto.lng && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {selectedPhoto.lat.toFixed(5)}, {selectedPhoto.lng.toFixed(5)}
                    </span>
                  )}
                </div>

                {/* 保存ボタン */}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedPhoto(null)}>
                    キャンセル
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={savePhoto}
                    disabled={saving}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {saving ? '保存中...' : '確認・保存'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
