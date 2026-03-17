'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, Clock } from 'lucide-react'

interface PhotoCardProps {
  publicUrl: string
  constructionTypeName?: string | null
  takenAt?: string | null
  status: 'confirmed' | 'analyzed' | 'pending'
  onClick?: () => void
  className?: string
}

export function PhotoCard({ publicUrl, constructionTypeName, takenAt, status, onClick, className }: PhotoCardProps) {
  const dateLabel = takenAt
    ? new Date(takenAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
    : null

  return (
    <div
      className={cn('relative aspect-square rounded-xl overflow-hidden cursor-pointer group', className)}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={publicUrl} alt="工事写真" className="w-full h-full object-cover group-active:opacity-90 transition-opacity" />

      {/* 下部オーバーレイ */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        {constructionTypeName && (
          <p className="text-white text-sm font-bold leading-tight truncate">{constructionTypeName}</p>
        )}
        {dateLabel && (
          <p className="text-white/80 text-xs mt-0.5">{dateLabel}</p>
        )}
      </div>

      {/* 右上ステータスバッジ */}
      <div className="absolute top-2 right-2">
        {status === 'confirmed' ? (
          <div className="bg-green-500 rounded-full p-1">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        ) : status === 'analyzed' ? (
          <div className="bg-yellow-400 rounded-full p-1">
            <Clock className="h-4 w-4 text-white" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
