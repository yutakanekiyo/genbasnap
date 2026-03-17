import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PhotoDetailClient } from '@/components/photos/photo-detail-client'

export default async function PhotoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: photo } = await supabase
    .from('photos')
    .select('*, construction_type:construction_types(id, name), construction_part:construction_parts(id, name), project:projects(id, name)')
    .eq('id', id)
    .single()

  if (!photo) notFound()

  const publicUrl = supabase.storage.from('photos').getPublicUrl(photo.storage_path).data.publicUrl

  // この現場の工種一覧
  let constructionTypes: { id: string; name: string }[] = []
  let constructionParts: { id: string; name: string; type_id: string }[] = []
  if (photo.project_id) {
    const { data: types } = await supabase
      .from('construction_types')
      .select('id, name')
      .eq('project_id', photo.project_id)
      .order('sort_order')
    constructionTypes = types ?? []

    if (constructionTypes.length > 0) {
      const { data: parts } = await supabase
        .from('construction_parts')
        .select('id, name, type_id')
        .in('type_id', constructionTypes.map(t => t.id))
        .order('sort_order')
      constructionParts = parts ?? []
    }
  }

  return (
    <PhotoDetailClient
      photo={{ ...photo, public_url: publicUrl }}
      constructionTypes={constructionTypes}
      constructionParts={constructionParts}
    />
  )
}
