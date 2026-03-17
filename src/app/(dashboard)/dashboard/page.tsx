import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Camera, HardHat, Clock, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('name, organizations(name)')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: todayPhotos },
    { count: unconfirmedPhotos },
    { data: recentProjects },
  ] = await Promise.all([
    supabase.from('photos').select('*', { count: 'exact', head: true }).gte('created_at', today),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('status', 'analyzed'),
    supabase.from('projects').select('id, name, address').eq('status', 'active').order('created_at', { ascending: false }).limit(3),
  ])

  const userName = userData?.name ?? 'さん'
  const dateLabel = new Date().toLocaleDateString('ja-JP', {
    month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* あいさつ */}
      <div>
        <p className="text-2xl font-bold text-gray-900">おはようございます、{userName}</p>
        <p className="text-base text-gray-500 mt-1">{dateLabel}</p>
      </div>

      {/* 写真を撮るボタン */}
      <Link href="/photos/upload">
        <div className="bg-blue-600 rounded-2xl p-6 flex items-center gap-4 active:opacity-90 transition-opacity shadow-lg shadow-blue-200">
          <div className="bg-white/20 rounded-2xl p-3">
            <Camera className="h-10 w-10 text-white" />
          </div>
          <div className="text-white">
            <p className="text-xl font-bold">写真を撮る</p>
            <p className="text-sm text-blue-100 mt-0.5">タップしてカメラを起動</p>
          </div>
        </div>
      </Link>

      {/* 今日の状況 */}
      <div>
        <p className="text-base font-bold text-gray-700 mb-3">今日の状況</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{todayPhotos ?? 0}<span className="text-lg font-normal text-gray-500 ml-1">枚</span></p>
            <p className="text-sm text-gray-500 mt-1">今日の撮影</p>
          </div>
          <div className={`rounded-2xl p-4 border shadow-sm ${(unconfirmedPhotos ?? 0) > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
            <p className={`text-3xl font-bold ${(unconfirmedPhotos ?? 0) > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
              {unconfirmedPhotos ?? 0}<span className="text-lg font-normal text-gray-500 ml-1">枚</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">未確認</p>
            {(unconfirmedPhotos ?? 0) > 0 && (
              <Link href="/photos" className="text-xs text-yellow-700 font-medium mt-1 inline-flex items-center gap-0.5">
                確認する <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 最近の現場 */}
      {recentProjects && recentProjects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-bold text-gray-700">最近の現場</p>
            <Link href="/projects" className="text-sm text-blue-600 font-medium">すべて見る</Link>
          </div>
          <div className="space-y-2">
            {recentProjects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3 active:bg-gray-50">
                  <div className="bg-blue-100 rounded-xl p-2.5 flex-shrink-0">
                    <HardHat className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-gray-900 truncate">{project.name}</p>
                    {project.address && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">{project.address}</p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 現場がない場合 */}
      {(!recentProjects || recentProjects.length === 0) && (
        <div className="bg-white rounded-2xl p-6 border border-dashed border-gray-300 text-center">
          <HardHat className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-bold text-gray-700">まだ現場がありません</p>
          <p className="text-sm text-gray-500 mt-1">現場を登録して写真を管理しましょう</p>
          <Link href="/projects">
            <div className="mt-4 bg-blue-600 text-white rounded-xl py-3 px-6 text-base font-bold inline-block">
              現場を登録する
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
