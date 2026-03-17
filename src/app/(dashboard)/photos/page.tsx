import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PhotosListClient } from '@/components/photos/photos-list-client'

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; type?: string; filter?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('created_at', { ascending: false })

  let query = supabase
    .from('photos')
    .select('*, construction_type:construction_types(id, name), construction_part:construction_parts(id, name)')
    .order('created_at', { ascending: false })
    .limit(60)

  if (params.project) query = query.eq('project_id', params.project)
  if (params.type) query = query.eq('type_id', params.type)

  const today = new Date().toISOString().split('T')[0]
  if (params.filter === 'today') query = query.gte('created_at', today)
  else if (params.filter === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    query = query.gte('created_at', weekAgo)
  } else if (params.filter === 'unconfirmed') query = query.eq('status', 'analyzed')

  const { data: photos } = await query

  let constructionTypes: { id: string; name: string }[] = []
  if (params.project) {
    const { data } = await supabase.from('construction_types').select('id, name').eq('project_id', params.project).order('sort_order')
    constructionTypes = data ?? []
  }

  const photosWithUrl = (photos ?? []).map(photo => ({
    ...photo,
    public_url: supabase.storage.from('photos').getPublicUrl(photo.storage_path).data.publicUrl,
  }))

  return (
    <PhotosListClient
      photos={photosWithUrl}
      projects={projects ?? []}
      constructionTypes={constructionTypes}
      initialProjectId={params.project}
      initialFilter={params.filter}
    />
  )
}
