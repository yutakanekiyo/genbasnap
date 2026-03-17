'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { StepIndicator } from '@/components/ui/StepIndicator'
import { BigButton } from '@/components/ui/BigButton'
import { LargeSelector } from '@/components/ui/LargeSelector'
import { SuccessScreen } from '@/components/feedback/SuccessScreen'
import { Camera, Images, Loader2, Check, Plus, ChevronRight } from 'lucide-react'
import * as ExifReader from 'exifr'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

interface Suggestion {
  detected_name: string
  source: 'blackboard_ocr' | 'ai_vision'
  match_method: 'exact' | 'partial' | 'alias' | 'new'
  matched_type: { id: string; name: string } | null
  candidates: { id: string; name: string }[]
}

interface AnalysisResult {
  construction_type?: { id: string | null; name: string; confidence: number; is_new?: boolean }
  construction_part?: { id: string | null; name: string; confidence: number }
  blackboard?: { detected: boolean }
}

interface ConstructionType {
  id: string
  name: string
  construction_parts: { id: string; name: string }[]
}

export default function UploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [step, setStep] = useState<Step>(1)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [photoId, setPhotoId] = useState<string | null>(null)

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('project') ?? '')
  const [constructionTypes, setConstructionTypes] = useState<ConstructionType[]>([])

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [suggestionHandled, setSuggestionHandled] = useState(false)
  const [addingNewType, setAddingNewType] = useState(false)

  const [typeId, setTypeId] = useState('')
  const [typeName, setTypeName] = useState('')
  const [partId, setPartId] = useState('')
  const [partName, setPartName] = useState('')
  const [description, setDescription] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('projects').select('id, name').eq('status', 'active').order('created_at', { ascending: false })
      .then(({ data }) => setProjects(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedProjectId) return
    supabase.from('construction_types')
      .select('id, name, construction_parts(id, name)')
      .eq('project_id', selectedProjectId)
      .order('sort_order')
      .then(({ data }) => setConstructionTypes((data ?? []) as ConstructionType[]))
  }, [selectedProjectId])

  function handleFileSelect(selectedFile: File) {
    setFile(selectedFile)
    setPreview(URL.createObjectURL(selectedFile))
    setSuggestion(null)
    setSuggestionHandled(false)
    setTypeId('')
    setTypeName('')
    setPartId('')
    setPartName('')
    setDescription('')
    setStep(2)
    analyzePhoto(selectedFile)
  }

  async function analyzePhoto(selectedFile: File) {
    setAnalyzing(true)
    try {
      let takenAt: string | null = null
      let lat: number | null = null
      let lng: number | null = null
      try {
        const exif = await ExifReader.parse(selectedFile, { gps: true }) ?? {}
        if (exif.DateTimeOriginal instanceof Date) takenAt = exif.DateTimeOriginal.toISOString()
        if (typeof exif.latitude === 'number') lat = exif.latitude
        if (typeof exif.longitude === 'number') lng = exif.longitude
      } catch { /* EXIFなし */ }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = selectedFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const storagePath = `${selectedProjectId || 'tmp'}/${Date.now()}.${ext}`
      await supabase.storage.from('photos').upload(storagePath, selectedFile, { contentType: selectedFile.type })

      const { data: record } = await supabase.from('photos').insert({
        project_id: selectedProjectId || null,
        storage_path: storagePath,
        original_filename: selectedFile.name,
        taken_at: takenAt,
        lat, lng,
        uploaded_by: user.id,
        status: 'pending',
      }).select().single()

      if (record) setPhotoId(record.id)

      if (selectedProjectId) {
        const base64 = await fileToBase64(selectedFile)
        const res = await fetch('/api/photos/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoId: record?.id, imageBase64: base64, mimeType: selectedFile.type, projectId: selectedProjectId }),
        })
        if (res.ok) {
          const data = await res.json()
          const s: Suggestion | null = data.suggestion ?? null
          setSuggestion(s)

          // 完全一致のみ自動セット
          if (s?.match_method === 'exact' && s.matched_type) {
            setTypeId(s.matched_type.id)
            setTypeName(s.matched_type.name)
            setSuggestionHandled(true)
          }

          // 部位は引き続きAIが一致したものを使う
          const a: AnalysisResult = data.analysis ?? {}
          if (a.construction_part?.id) {
            setPartId(a.construction_part.id)
            setPartName(a.construction_part.name)
          }
          if (data.description) setDescription(data.description)
        }
      }
    } catch (err) {
      toast.error('写真の読み込みに失敗しました。もう一度お試しください')
      console.error(err)
    } finally {
      setAnalyzing(false)
    }
  }

  async function addNewType(name: string) {
    if (!selectedProjectId) return
    setAddingNewType(true)
    try {
      const { data } = await supabase
        .from('construction_types')
        .insert({
          project_id: selectedProjectId,
          name,
          sort_order: constructionTypes.length,
          auto_added: true,
          original_detected_name: name,
        })
        .select()
        .single()

      if (data) {
        const newType: ConstructionType = { ...data, construction_parts: [] }
        setConstructionTypes(prev => [...prev, newType])
        setTypeId(data.id)
        setTypeName(data.name)
        setSuggestionHandled(true)
        toast.success(`「${name}」を工種に追加しました`)
      }
    } catch {
      toast.error('工種の追加に失敗しました')
    } finally {
      setAddingNewType(false)
    }
  }

  async function handleConfirm() {
    if (!photoId) { toast.error('写真の保存に失敗しました'); return }
    setSaving(true)
    const { error } = await supabase.from('photos').update({
      type_id: typeId || null,
      part_id: partId || null,
      description,
      project_id: selectedProjectId || null,
      status: 'confirmed',
    }).eq('id', photoId)

    if (error) {
      toast.error('保存に失敗しました。もう一度お試しください')
    } else {
      setStep(3)
    }
    setSaving(false)
  }

  function resetAll() {
    setStep(1)
    setFile(null)
    setPreview(null)
    setPhotoId(null)
    setSuggestion(null)
    setSuggestionHandled(false)
    setTypeId('')
    setTypeName('')
    setPartId('')
    setPartName('')
    setDescription('')
  }

  const selectedType = constructionTypes.find(t => t.id === typeId)
  const partOptions = selectedType?.construction_parts ?? []

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <StepIndicator steps={['撮る', '確認', '完了']} current={step} />

      {/* ステップ1 */}
      {step === 1 && (
        <div className="space-y-4 mt-4">
          <p className="text-xl font-bold text-gray-900 text-center">写真を撮るか、選んでください</p>

          {projects.length > 0 && (
            <LargeSelector
              label="現場"
              options={projects}
              value={selectedProjectId}
              onChange={(id) => setSelectedProjectId(id)}
              placeholder="現場を選んでください"
            />
          )}

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 bg-blue-600 text-white rounded-2xl py-8 active:opacity-90"
            >
              <Camera className="h-10 w-10" />
              <span className="text-base font-bold">カメラで撮影</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 bg-white text-blue-600 border-2 border-blue-600 rounded-2xl py-8 active:opacity-90"
            >
              <Images className="h-10 w-10" />
              <span className="text-base font-bold">写真をえらぶ</span>
            </button>
          </div>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
        </div>
      )}

      {/* ステップ2 */}
      {step === 2 && (
        <div className="space-y-4 mt-2">
          {preview && (
            <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="撮影した写真" className="w-full h-full object-contain" />
            </div>
          )}

          {/* 解析中 */}
          {analyzing ? (
            <div className="bg-blue-50 rounded-2xl p-6 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <p className="text-base font-bold text-blue-700">よみとり中...</p>
              <p className="text-sm text-blue-600">工種・説明文を自動で入力しています</p>
            </div>
          ) : (
            <>
              {/* 提案バナー */}
              {suggestion && !suggestionHandled && (
                <SuggestionBanner
                  suggestion={suggestion}
                  onAccept={(id, name) => { setTypeId(id); setTypeName(name); setSuggestionHandled(true) }}
                  onAddNew={() => addNewType(suggestion.detected_name)}
                  onDismiss={() => setSuggestionHandled(true)}
                  loading={addingNewType}
                />
              )}

              {/* 完全一致の場合の確認バナー */}
              {suggestion?.match_method === 'exact' && suggestionHandled && (
                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-800">
                      {suggestion.source === 'blackboard_ocr' ? '黒板から' : '写真の内容から'}自動よみとりしました
                    </p>
                    <p className="text-sm text-green-600">「{suggestion.detected_name}」→ {suggestion.matched_type?.name}</p>
                  </div>
                </div>
              )}

              {/* 黒板なしの注記 */}
              {suggestion && suggestion.source === 'ai_vision' && suggestionHandled && (
                <p className="text-xs text-gray-400 text-center">※ 黒板が見つからなかったため、写真の内容から判定しました</p>
              )}
            </>
          )}

          {/* 工種 */}
          <LargeSelector
            label="工種"
            options={constructionTypes}
            value={typeId}
            onChange={(id, name) => { setTypeId(id); setTypeName(name ?? ''); setPartId(''); setPartName('') }}
            placeholder="工種を選んでください"
          />

          {/* 部位 */}
          <LargeSelector
            label="部位"
            options={partOptions}
            value={partId}
            onChange={(id, name) => { setPartId(id); setPartName(name ?? '') }}
            placeholder="部位を選んでください"
            disabled={!typeId}
          />

          {/* 説明文 */}
          <div className="space-y-2">
            <p className="text-base font-bold text-gray-700">説明文</p>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="写真の説明を入力してください（自動で入力されます）"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-base text-gray-900 outline-none focus:border-blue-600 resize-none placeholder:text-gray-400"
            />
          </div>

          <BigButton onClick={handleConfirm} loading={saving} loadingText="保存中..." disabled={analyzing}>
            ✓ これでOK
          </BigButton>
          <p className="text-center text-sm text-gray-400">あとで修正もできます</p>
        </div>
      )}

      {/* ステップ3 */}
      {step === 3 && (
        <SuccessScreen
          message="送信しました！"
          primaryLabel="もう1枚撮る"
          primaryAction={resetAll}
          secondaryLabel="ホームへ戻る"
          secondaryAction={() => router.push('/dashboard')}
        />
      )}
    </div>
  )
}

// 提案バナーコンポーネント
function SuggestionBanner({
  suggestion,
  onAccept,
  onAddNew,
  onDismiss,
  loading,
}: {
  suggestion: Suggestion
  onAccept: (id: string, name: string) => void
  onAddNew: () => void
  onDismiss: () => void
  loading: boolean
}) {
  const [selected, setSelected] = useState<string>(
    suggestion.matched_type?.id ?? '__new__'
  )

  // ケース2: partial / alias → 候補から選ぶ
  if (suggestion.match_method === 'partial' || suggestion.match_method === 'alias') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-yellow-800">
            {suggestion.source === 'blackboard_ocr' ? '黒板に' : '写真から'}
            「{suggestion.detected_name}」が検出されました
          </p>
          <p className="text-sm text-yellow-700 mt-1">これはどの工種ですか？</p>
        </div>

        <div className="space-y-2">
          {suggestion.candidates.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-base font-medium text-left',
                selected === c.id ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700'
              )}
            >
              <span>{c.name}{i === 0 ? '　← おすすめ' : ''}</span>
              {selected === c.id && <Check className="h-4 w-4 text-blue-600" />}
            </button>
          ))}
          <button
            onClick={() => setSelected('__new__')}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-base font-medium text-left',
              selected === '__new__' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700'
            )}
          >
            <span>新しく「{suggestion.detected_name}」を追加</span>
            {selected === '__new__' && <Check className="h-4 w-4 text-blue-600" />}
          </button>
        </div>

        <button
          onClick={() => {
            if (selected === '__new__') {
              onAddNew()
            } else {
              const candidate = suggestion.candidates.find(c => c.id === selected)
              if (candidate) onAccept(candidate.id, candidate.name)
            }
          }}
          disabled={loading}
          className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl text-base active:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          決定
        </button>
      </div>
    )
  }

  // ケース3: new → 追加を提案
  if (suggestion.match_method === 'new') {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-orange-800">
            {suggestion.source === 'blackboard_ocr' ? '黒板に' : '写真から'}
            「{suggestion.detected_name}」が検出されました
          </p>
          <p className="text-sm text-orange-700 mt-1">この工種はまだ登録されていません</p>
        </div>

        <button
          onClick={onAddNew}
          disabled={loading}
          className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl text-base active:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus className="h-4 w-4" />
          }
          「{suggestion.detected_name}」を追加する
        </button>

        <button
          onClick={onDismiss}
          className="w-full h-10 text-gray-500 font-medium text-sm flex items-center justify-center gap-1"
        >
          既存の工種から選ぶ
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return null
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
