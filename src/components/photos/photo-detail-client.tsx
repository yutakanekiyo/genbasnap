'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BigButton } from '@/components/ui/BigButton'
import { LargeSelector } from '@/components/ui/LargeSelector'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Calendar, HardHat, Layers, FileText, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Photo {
  id: string
  storage_path: string
  public_url: string
  taken_at: string | null
  description: string | null
  status: 'confirmed' | 'analyzed' | 'pending'
  type_id: string | null
  part_id: string | null
  project_id: string | null
  construction_type?: { id: string; name: string } | null
  construction_part?: { id: string; name: string } | null
  project?: { id: string; name: string } | null
}

interface Props {
  photo: Photo
  constructionTypes: { id: string; name: string }[]
  constructionParts: { id: string; name: string; type_id: string }[]
}

export function PhotoDetailClient({ photo, constructionTypes, constructionParts }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const [typeId, setTypeId] = useState(photo.type_id ?? '')
  const [partId, setPartId] = useState(photo.part_id ?? '')
  const [description, setDescription] = useState(photo.description ?? '')

  const filteredParts = constructionParts.filter(p => p.type_id === typeId)
  const partOptions = filteredParts.map(p => ({ id: p.id, name: p.name }))

  async function saveEdit() {
    setSaving(true)
    const { error } = await supabase
      .from('photos')
      .update({
        type_id: typeId || null,
        part_id: partId || null,
        description: description || null,
      })
      .eq('id', photo.id)

    if (error) {
      toast.error('保存に失敗しました')
    } else {
      toast.success('更新しました')
      setEditing(false)
      router.refresh()
    }
    setSaving(false)
  }

  async function confirmPhoto() {
    setConfirming(true)
    const { error } = await supabase
      .from('photos')
      .update({ status: 'confirmed' })
      .eq('id', photo.id)

    if (error) {
      toast.error('確認に失敗しました')
    } else {
      toast.success('確認済みにしました')
      router.refresh()
    }
    setConfirming(false)
  }

  const takenAtLabel = photo.taken_at
    ? new Date(photo.taken_at).toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* 戻るボタン */}
      <div className="px-4 pt-4 pb-2">
        <button onClick={() => router.back()} className="text-blue-600 font-medium text-base flex items-center gap-1">
          ← もどる
        </button>
      </div>

      {/* 写真 */}
      <div className="relative w-full aspect-square bg-gray-100">
        <Image
          src={photo.public_url}
          alt="工事写真"
          fill
          className="object-cover"
          sizes="(max-width: 512px) 100vw, 512px"
        />
        <div className="absolute top-3 right-3">
          <StatusBadge status={photo.status} />
        </div>
      </div>

      {/* 情報カード */}
      <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden">
        {/* 工種 */}
        <div className={cn('px-5 py-4 border-b border-gray-100', editing && 'py-3')}>
          <div className="flex items-center gap-2 mb-1">
            <HardHat className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-bold text-gray-500">工種</p>
          </div>
          {editing ? (
            <LargeSelector
              label=""
              options={constructionTypes}
              value={typeId}
              onChange={(v) => { setTypeId(v); setPartId('') }}
              placeholder="工種を選択"
            />
          ) : (
            <p className="text-base font-medium text-gray-900 ml-6">
              {photo.construction_type?.name ?? '未設定'}
            </p>
          )}
        </div>

        {/* 部位 */}
        <div className={cn('px-5 py-4 border-b border-gray-100', editing && 'py-3')}>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-bold text-gray-500">部位</p>
          </div>
          {editing ? (
            <LargeSelector
              label=""
              options={partOptions}
              value={partId}
              onChange={setPartId}
              placeholder={typeId ? '部位を選択' : '先に工種を選んでください'}
            />
          ) : (
            <p className="text-base font-medium text-gray-900 ml-6">
              {photo.construction_part?.name ?? '未設定'}
            </p>
          )}
        </div>

        {/* 説明 */}
        <div className={cn('px-5 py-4 border-b border-gray-100', editing && 'py-3')}>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-bold text-gray-500">説明</p>
          </div>
          {editing ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="説明を入力"
              rows={3}
              className="w-full text-base border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ml-0"
            />
          ) : (
            <p className="text-base text-gray-900 ml-6 whitespace-pre-wrap">
              {photo.description ?? '未設定'}
            </p>
          )}
        </div>

        {/* 撮影日時 */}
        {takenAtLabel && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <p className="text-sm font-bold text-gray-500">撮影日時</p>
            </div>
            <p className="text-base text-gray-900 ml-6 mt-1">{takenAtLabel}</p>
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="px-4 mt-5 space-y-3">
        {editing ? (
          <div className="flex gap-3">
            <button
              onClick={() => { setEditing(false); setTypeId(photo.type_id ?? ''); setPartId(photo.part_id ?? ''); setDescription(photo.description ?? '') }}
              className="flex-1 h-14 rounded-2xl border-2 border-gray-200 text-base font-bold text-gray-600 flex items-center justify-center gap-2"
            >
              <X className="h-5 w-5" />
              やめる
            </button>
            <BigButton onClick={saveEdit} loading={saving} loadingText="保存中..." className="flex-1">
              <Check className="h-5 w-5" />
              保存する
            </BigButton>
          </div>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="w-full h-14 rounded-2xl border-2 border-gray-200 bg-white text-base font-bold text-gray-700 flex items-center justify-center gap-2 active:bg-gray-50"
            >
              <Pencil className="h-5 w-5" />
              修正する
            </button>
            {photo.status !== 'confirmed' && (
              <BigButton onClick={confirmPhoto} loading={confirming} loadingText="確認中...">
                <Check className="h-5 w-5" />
                確認済みにする
              </BigButton>
            )}
          </>
        )}
      </div>
    </div>
  )
}
