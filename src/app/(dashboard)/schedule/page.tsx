import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScheduleClient } from '@/components/schedule/schedule-client'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, start_date, end_date')
    .order('created_at', { ascending: false })

  let schedules: unknown[] = []
  if (params.project) {
    const { data } = await supabase
      .from('schedules')
      .select('*, construction_type:construction_types(name)')
      .eq('project_id', params.project)
      .order('sort_order')
    schedules = data ?? []
  }

  return (
    <ScheduleClient
      projects={projects ?? []}
      schedules={schedules as Parameters<typeof ScheduleClient>[0]['schedules']}
      initialProjectId={params.project}
    />
  )
}
