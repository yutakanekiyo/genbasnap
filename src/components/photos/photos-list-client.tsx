'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PhotoCard } from '@/components/ui/PhotoCard'
import { BigButton } from '@/components/ui/BigButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { LargeSelector } from '@/components/ui/LargeSelector'
import { Camera, Images, Filter, Check, ChevronDown } from 'lucide-react'
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
  construction_type?: { id: string; name: string } | null
  construction_part?: { id: string; name: string } | null
}

interface Props {
  photos: Photo[]
  projects: { id: string; name: string }[]
  constructionTypes: { id: string; name: string }[]
  initialProjectId?: string
  initialFilter?: string
}

const FILTERS = [
  { key: '', label: '全部' },
  { key: 'today', label: '今日' },
  { key: 'week', label: '今週' },
  { key: 'unconfirmed', label: '未確認' },
]

export function PhotosListClient({ photos, projects, constructionTypes, initialProjectId, initialFilter }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [activeFilter, setActiveFilter] = useState(initialFilter ?? '')
  const [selectedProject, setSelectedProject] = useState(initialProjectId ?? '')
  const [showProjectSelector, setShowProjectSelector] = useState(false)

  function applyFilter(filter: string) {
    setActiveFilter(filter)
    const params = new URLSearchParams()
    if (selectedProject) params.set('project', selectedProject)
    if (filter) params.set('filter', filter)
    router.push(`/photos?${params.toString()}`)
  }

  function applyProject(id: string) {
    setSelectedProject(id)
    const params = new URLSearchParams()
    if (id) params.set('project', id)
    if (activeFilter) params.set('filter', activeFilter)
    router.push(`/photos?${params.toString()}`)
    setShowProjectSelector(false)
  }

  const allFilters = [
    ...FILTERS,
    ...constructionTypes.map(t => ({ key: `type:${t.id}`, label: t.name })),
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-4 pt-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xl font-bold text-gray-900">写真一覧</p>
          <Link href="/photos/upload">
            <div className="bg-blue-600 text-white rounded-xl px-4 py-2 flex items-center gap-1.5 text-sm font-bold">
              <Camera className="h-4 w-4" />
              撮る
            </div>
          </Link>
        </div>

        {/* 現場しぼりこみ */}
        {projects.length > 0 && (
          <button
            onClick={() => setShowProjectSelector(true)}
            className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 text-sm font-medium text-gray-700"
          >
            <Filter className="h-4 w-4 text-gray-400" />
            {selectedProject ? projects.find(p => p.id === selectedProject)?.name : 'すべての現場'}
            <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
          </button>
        )}

        {/* フィルタチップ */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {allFilters.map(f => (
            <button
              key={f.key}
              onClick={() => applyFilter(f.key.startsWith('type:') ? f.key : f.key)}
              className={cn(
                'flex-shrink-0 h-10 px-4 rounded-full text-sm font-medium transition-colors',
                activeFilter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 写真グリッド */}
      <div className="flex-1 p-4">
        {photos.length === 0 ? (
          <EmptyState
            icon={<Images className="h-20 w-20" />}
            title="まだ写真がありません"
            description="写真を撮って工事記録を始めましょう"
            actionLabel="写真を撮る"
            onAction={() => router.push('/photos/upload')}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {photos.map(photo => (
              <PhotoCard
                key={photo.id}
                publicUrl={photo.public_url}
                constructionTypeName={photo.construction_type?.name}
                takenAt={photo.taken_at}
                status={photo.status}
                onClick={() => router.push(`/photos/${photo.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 現場選択オーバーレイ */}
      {showProjectSelector && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center" onClick={() => setShowProjectSelector(false)}>
          <div className="bg-white w-full md:w-96 rounded-t-2xl md:rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b">
              <p className="text-lg font-bold text-gray-900">現場をえらぶ</p>
            </div>
            <div className="overflow-y-auto max-h-80">
              <button
                onClick={() => applyProject('')}
                className={cn('w-full flex items-center justify-between px-4 py-4 border-b text-base font-medium', !selectedProject && 'text-blue-600')}
              >
                すべての現場
                {!selectedProject && <Check className="h-5 w-5" />}
              </button>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyProject(p.id)}
                  className={cn('w-full flex items-center justify-between px-4 py-4 border-b last:border-0 text-base font-medium', selectedProject === p.id && 'text-blue-600')}
                >
                  {p.name}
                  {selectedProject === p.id && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
