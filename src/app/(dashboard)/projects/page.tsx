import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HardHat, Images, MapPin, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, code, address, status, created_at')
    .order('status')
    .order('created_at', { ascending: false })

  // 各現場の写真枚数を取得
  const photoCounts: Record<string, number> = {}
  if (projects && projects.length > 0) {
    for (const p of projects) {
      const { count } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', p.id)
      photoCounts[p.id] = count ?? 0
    }
  }

  const active = projects?.filter(p => p.status === 'active') ?? []
  const others = projects?.filter(p => p.status !== 'active') ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <p className="text-2xl font-bold text-gray-900">現場一覧</p>
      </div>

      {(!projects || projects.length === 0) ? (
        <EmptyState
          icon={<HardHat className="h-20 w-20" />}
          title="まだ現場がありません"
          description="現場を登録して写真管理を始めましょう"
        />
      ) : (
        <div className="space-y-6">
          {/* 進行中 */}
          {active.length > 0 && (
            <section>
              <p className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">進行中</p>
              <div className="space-y-3">
                {active.map(project => (
                  <ProjectCard key={project.id} project={project} photoCount={photoCounts[project.id] ?? 0} />
                ))}
              </div>
            </section>
          )}
          {/* 完了・アーカイブ */}
          {others.length > 0 && (
            <section>
              <p className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">完了・アーカイブ</p>
              <div className="space-y-3">
                {others.map(project => (
                  <ProjectCard key={project.id} project={project} photoCount={photoCounts[project.id] ?? 0} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* FABボタン */}
      <div className="fixed bottom-24 md:bottom-8 right-6 z-40">
        <CreateProjectDialog fab />
      </div>
    </div>
  )
}

function ProjectCard({ project, photoCount }: { project: { id: string; name: string; address: string | null; status: string; code: string | null }; photoCount: number }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 active:bg-gray-50 transition-colors min-h-[80px]">
        <div className="bg-blue-100 rounded-2xl p-3 flex-shrink-0">
          <HardHat className="h-7 w-7 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-gray-900 leading-tight">{project.name}</p>
          {project.address && (
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1 truncate">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              {project.address}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-3 py-1">
            <Images className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-bold text-gray-700">{photoCount}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
