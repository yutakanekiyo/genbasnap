import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await request.json()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const { data: photos } = await supabase
    .from('photos')
    .select('*, construction_type:construction_types(name), construction_part:construction_parts(name)')
    .eq('project_id', projectId)
    .eq('status', 'confirmed')
    .order('taken_at', { ascending: true })

  if (!photos || photos.length === 0) {
    return NextResponse.json({ error: 'No confirmed photos found' }, { status: 400 })
  }

  const zip = new JSZip()

  // PHOTOフォルダ作成
  const photoFolder = zip.folder('PHOTO')!

  // PHOTO.XML生成
  const photoXmlEntries = photos.map((photo, idx) => {
    const photoNo = String(idx + 1).padStart(4, '0')
    const filename = `P${photoNo}.jpg`
    const takenDate = photo.taken_at
      ? new Date(photo.taken_at).toISOString().split('T')[0].replace(/-/g, '')
      : ''

    return {
      filename,
      photo,
      xml: `  <写真情報>
    <写真ファイル名>${filename}</写真ファイル名>
    <撮影年月日>${takenDate}</撮影年月日>
    <工種>${(photo.construction_type as { name?: string } | null)?.name ?? ''}</工種>
    <部位>${(photo.construction_part as { name?: string } | null)?.name ?? ''}</部位>
    <写真タイトル>${photo.description ?? ''}</写真タイトル>
  </写真情報>`,
    }
  })

  const photoXml = `<?xml version="1.0" encoding="Shift_JIS"?>
<写真情報ファイル>
  <基礎情報>
    <工事名>${project.name}</工事名>
    <工事番号>${project.code ?? ''}</工事番号>
    <工事場所>${project.address ?? ''}</工事場所>
  </基礎情報>
${photoXmlEntries.map(e => e.xml).join('\n')}
</写真情報ファイル>`

  photoFolder.file('PHOTO.XML', photoXml)

  // INDEX_C.XML生成
  const indexXml = `<?xml version="1.0" encoding="Shift_JIS"?>
<工事管理ファイル>
  <工事件名等>
    <工事名>${project.name}</工事名>
    <工事番号>${project.code ?? ''}</工事番号>
    <工事場所>${project.address ?? ''}</工事場所>
    <工期開始日>${project.start_date?.replace(/-/g, '') ?? ''}</工期開始日>
    <工期終了日>${project.end_date?.replace(/-/g, '') ?? ''}</工期終了日>
    <写真枚数>${photos.length}</写真枚数>
  </工事件名等>
</工事管理ファイル>`

  zip.file('INDEX_C.XML', indexXml)

  // 写真ファイルをダウンロードしてZIPに追加
  for (const entry of photoXmlEntries) {
    try {
      const { data: fileData } = await supabase.storage
        .from('photos')
        .download(entry.photo.storage_path)

      if (fileData) {
        const buffer = await fileData.arrayBuffer()
        photoFolder.file(entry.filename, buffer)
      }
    } catch (err) {
      console.warn(`Failed to download photo ${entry.photo.storage_path}:`, err)
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })

  return new NextResponse(zipBuffer as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="delivery_${project.name}_${new Date().toISOString().split('T')[0]}.zip"`,
    },
  })
}
