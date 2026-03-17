'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, X, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react'
import type { ConstructionType } from '@/types'
import * as ExifReader from 'exifr'

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'analyzing' | 'done' | 'error'
  progress: number
  error?: string
}

interface Props {
  projectId: string
  constructionTypes: (ConstructionType & { construction_parts: { id: string; name: string }[] })[]
  onSuccess?: () => void
}

export function PhotoUploader({ projectId, constructionTypes, onSuccess }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    const uploadFiles: UploadFile[] = fileArray
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        file: f,
        preview: URL.createObjectURL(f),
        status: 'pending',
        progress: 0,
      }))
    setFiles(prev => [...prev, ...uploadFiles])
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  function removeFile(index: number) {
    setFiles(prev => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function uploadAll() {
    if (files.length === 0 || isUploading) return
    setIsUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'done') continue

      setFiles(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'uploading', progress: 10 } : f
      ))

      try {
        const file = files[i].file

        // EXIF解析
        let exifData: Record<string, unknown> = {}
        try {
          exifData = await ExifReader.parse(file, { gps: true }) ?? {}
        } catch {
          // EXIFなし
        }

        const takenAt = (exifData.DateTimeOriginal as Date | undefined) instanceof Date
          ? (exifData.DateTimeOriginal as Date).toISOString()
          : null
        const lat = typeof exifData.latitude === 'number' ? exifData.latitude : null
        const lng = typeof exifData.longitude === 'number' ? exifData.longitude : null

        // ファイル名生成
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const storagePath = `${projectId}/${Date.now()}_${i}.${ext}`

        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, progress: 30 } : f
        ))

        // Supabase Storageにアップロード
        const { error: storageError } = await supabase.storage
          .from('photos')
          .upload(storagePath, file, { contentType: file.type })

        if (storageError) throw storageError

        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, progress: 60 } : f
        ))

        // photosテーブルに挿入
        const { data: photoRecord, error: dbError } = await supabase
          .from('photos')
          .insert({
            project_id: projectId,
            storage_path: storagePath,
            original_filename: file.name,
            taken_at: takenAt,
            lat,
            lng,
            uploaded_by: user.id,
            status: 'pending',
          })
          .select()
          .single()

        if (dbError) throw dbError

        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'analyzing', progress: 70 } : f
        ))

        // Base64変換してAI解析
        const base64 = await fileToBase64(file)
        const mimeType = file.type || 'image/jpeg'

        const analyzeRes = await fetch('/api/photos/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoId: photoRecord.id,
            imageBase64: base64,
            mimeType,
            projectId,
          }),
        })

        if (!analyzeRes.ok) {
          console.warn('AI analysis failed for photo', photoRecord.id)
        }

        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'done', progress: 100 } : f
        ))
      } catch (err) {
        console.error(err)
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'error', error: String(err) } : f
        ))
      }
    }

    setIsUploading(false)
    toast.success('写真のアップロードが完了しました')
    onSuccess?.()
    router.refresh()
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const doneCount = files.filter(f => f.status === 'done').length

  return (
    <div className="space-y-4">
      {/* ドラッグ＆ドロップエリア */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragging ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
        <p className="font-medium text-gray-700">写真をドラッグ＆ドロップ</p>
        <p className="text-sm text-gray-500 mt-1">またはクリックしてファイルを選択</p>
        <p className="text-xs text-gray-400 mt-2">JPEG / PNG / HEIC 対応 · 最大10MB/枚</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* ファイル一覧 */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {files.length}枚選択中
              {doneCount > 0 && ` (${doneCount}枚完了)`}
            </p>
            {pendingCount > 0 && !isUploading && (
              <Button
                onClick={uploadAll}
                className="bg-orange-500 hover:bg-orange-600"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-1" />
                {pendingCount}枚アップロード開始
              </Button>
            )}
            {isUploading && (
              <Button disabled size="sm">
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                アップロード中...
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {files.map((f, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden border bg-gray-50">
                {/* サムネイル */}
                <div className="aspect-square relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.preview}
                    alt={f.file.name}
                    className="w-full h-full object-cover"
                  />
                  {/* ステータスオーバーレイ */}
                  {f.status === 'uploading' || f.status === 'analyzing' ? (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin mb-1" />
                      <p className="text-xs text-white">
                        {f.status === 'uploading' ? '保存中' : 'AI解析中'}
                      </p>
                    </div>
                  ) : f.status === 'done' ? (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                  ) : f.status === 'error' ? (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <X className="h-8 w-8 text-red-600" />
                    </div>
                  ) : null}
                  {/* 削除ボタン */}
                  {f.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                      className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 hover:bg-black/70"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  )}
                </div>
                {/* ファイル名 */}
                <div className="p-1.5">
                  <p className="text-xs text-gray-600 truncate">{f.file.name}</p>
                  {(f.status === 'uploading' || f.status === 'analyzing') && (
                    <Progress value={f.progress} className="h-1 mt-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // data:image/jpeg;base64, の部分を除去
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
