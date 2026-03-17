import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Images, FileText, BarChart3, MapPin, Calendar, HardHat, ChevronRight } from 'lucide-react'
import { ConstructionTypesManager } from '@/components/projects/construction-types-manager'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: constructionTypes } = await supabase
    .from('construction_types')
    .select('*, construction_parts(*)')
    .eq('project_id', id)
    .order('sort_order')

  const { count: photoCount } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)

  const { count: confirmedCount } = await supabase
    .from('photos')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)
    .eq('status', 'confirmed')

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: '進行中', color: 'text-green-600 bg-green-100' },
    completed: { label: '完了', color: 'text-blue-600 bg-blue-100' },
    archived: { label: 'アーカイブ', color: 'text-gray-600 bg-gray-100' },
  }
  const status = statusMap[project.status] ?? statusMap.active

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* ヘッダー */}
      <Link href="/projects" className="text-blue-600 font-medium text-base flex items-center gap-1">
        ← 現場一覧
      </Link>

      {/* 現場情報カード */}
      <div className="bg-white rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 rounded-2xl p-3 flex-shrink-0">
            <HardHat className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-bold text-gray-900 leading-tight">{project.name}</p>
              <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                {status.label}
              </span>
            </div>
            {project.code && (
              <p className="text-sm text-gray-500 mt-1">工事番号: {project.code}</p>
            )}
          </div>
        </div>

        {(project.address || project.start_date || project.end_date) && (
          <div className="space-y-1.5 pt-2 border-t border-gray-100">
            {project.address && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                {project.address}
              </p>
            )}
            {(project.start_date || project.end_date) && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                {project.start_date && new Date(project.start_date).toLocaleDateString('ja-JP')}
                {project.start_date && project.end_date && ' 〜 '}
                {project.end_date && new Date(project.end_date).toLocaleDateString('ja-JP')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 写真数サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{photoCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">写真合計</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{confirmedCount ?? 0}</p>
          <p className="text-sm text-gray-500 mt-1">確認済み</p>
        </div>
      </div>

      {/* メニュー */}
      <div className="bg-white rounded-2xl overflow-hidden">
        <Link href={`/photos?project=${id}`} className="flex items-center gap-4 px-5 py-4 active:bg-gray-50 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Images className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-gray-900">写真を見る</p>
            <p className="text-sm text-gray-500">この現場の写真一覧</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300" />
        </Link>

        <Link href={`/ledger`} className="flex items-center gap-4 px-5 py-4 active:bg-gray-50 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-gray-900">台帳をつくる</p>
            <p className="text-sm text-gray-500">PDF・電子納品</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300" />
        </Link>

        <Link href={`/schedule?project=${id}`} className="flex items-center gap-4 px-5 py-4 active:bg-gray-50">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <BarChart3 className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-gray-900">工程管理</p>
            <p className="text-sm text-gray-500">ガントチャート</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300" />
        </Link>
      </div>

      {/* 工種・部位マスタ */}
      <div>
        <p className="text-base font-bold text-gray-700 mb-3">工種・部位の設定</p>
        <ConstructionTypesManager
          projectId={id}
          initialTypes={constructionTypes ?? []}
        />
      </div>
    </div>
  )
}
