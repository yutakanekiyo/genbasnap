import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { LedgerDocument } from '@/components/ledger/ledger-document'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, photoIds } = await request.json()

  // プロジェクト情報
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  // 組織情報
  const { data: userData } = await supabase
    .from('users')
    .select('organizations(name, logo_url)')
    .eq('id', user.id)
    .single()

  // 写真データ取得
  let query = supabase
    .from('photos')
    .select('*, construction_type:construction_types(name), construction_part:construction_parts(name)')
    .eq('project_id', projectId)
    .eq('status', 'confirmed')
    .order('taken_at', { ascending: true })

  if (photoIds && photoIds.length > 0) {
    query = query.in('id', photoIds)
  }

  const { data: photos } = await query

  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'No confirmed photos found' }, { status: 400 })
  }

  // 写真のPublic URL取得
  const photosWithUrl = photos.map(photo => {
    const { data } = supabase.storage.from('photos').getPublicUrl(photo.storage_path)
    return { ...photo, public_url: data.publicUrl }
  })

  try {
    const orgName = (userData?.organizations as { name?: string } | null)?.name ?? ''

    const element = createElement(LedgerDocument, {
      project,
      photos: photosWithUrl,
      organizationName: orgName,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as any)

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ledger_${project.name}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
