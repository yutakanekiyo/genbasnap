import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photoId, imageBase64, mimeType, projectId } = await request.json()

  // プロジェクトの工種・部位マスタを取得
  const { data: constructionTypes } = await supabase
    .from('construction_types')
    .select('id, name, construction_parts(id, name)')
    .eq('project_id', projectId)

  const masterJson = JSON.stringify(constructionTypes ?? [])

  // リクエストA: 工種・部位判定 + 黒板OCR
  const analysisPrompt = `あなたは建設工事の写真を解析するアシスタントです。以下の写真を分析してください。

## このプロジェクトの工種・部位マスタ
${masterJson}

## タスク
1. この写真に最も適切な「工種」と「部位」をマスタの中から選んでください。該当するものがない場合は新しい候補を提案してください。
2. 写真に黒板（工事看板）が写っている場合、黒板に記載されている情報を全て読み取ってください。

## 出力フォーマット（JSONのみ出力してください）
{
  "construction_type": { "id": "既存IDまたはnull", "name": "工種名", "confidence": 0.0-1.0 },
  "construction_part": { "id": "既存IDまたはnull", "name": "部位名", "confidence": 0.0-1.0 },
  "blackboard": {
    "detected": true or false,
    "fields": {
      "project_name": "",
      "construction_type": "",
      "location": "",
      "date": "",
      "contractor": "",
      "other": {}
    }
  }
}`

  let analysisResult: Record<string, unknown> = {}
  let descriptionResult = ''

  try {
    // リクエストA: 工種判定 + OCR
    const analysisResponse = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: analysisPrompt,
            },
          ],
        },
      ],
    })

    const analysisText = analysisResponse.content[0].type === 'text'
      ? analysisResponse.content[0].text
      : ''

    // JSONを抽出
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      analysisResult = JSON.parse(jsonMatch[0])
    }

    // リクエストB: 説明文生成（Aの結果を使用）
    const typeName = (analysisResult.construction_type as { name?: string })?.name ?? ''
    const partName = (analysisResult.construction_part as { name?: string })?.name ?? ''
    const blackboard = analysisResult.blackboard as { fields?: { date?: string } } | undefined

    const descriptionPrompt = `あなたは建設工事の写真台帳を作成するアシスタントです。以下の情報をもとに、工事写真台帳に記載する説明文を生成してください。

## 写真情報
- 工種: ${typeName}
- 部位: ${partName}
- 黒板情報: ${JSON.stringify(blackboard?.fields ?? {})}

## ルール
- 「である調」で記述すること
- 1〜2文で簡潔に記述すること
- 工事写真台帳の慣例に従った表現を使うこと
- 例: 「基礎配筋工の状況を示す。D13@200のダブル配筋であることが確認できる。」

## 出力
説明文のみを出力してください。`

    const descriptionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: descriptionPrompt,
        },
      ],
    })

    descriptionResult = descriptionResponse.content[0].type === 'text'
      ? descriptionResponse.content[0].text.trim()
      : ''

    // photosテーブルを更新
    const { error: updateError } = await supabase
      .from('photos')
      .update({
        ai_analysis: analysisResult,
        blackboard_ocr: (analysisResult.blackboard as Record<string, unknown>) ?? {},
        description: descriptionResult,
        type_id: (analysisResult.construction_type as { id?: string })?.id ?? null,
        part_id: (analysisResult.construction_part as { id?: string })?.id ?? null,
        status: 'analyzed',
      })
      .eq('id', photoId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      description: descriptionResult,
    })
  } catch (error) {
    console.error('AI analysis error:', error)

    // エラー時もstatusを更新
    await supabase
      .from('photos')
      .update({ status: 'analyzed' })
      .eq('id', photoId)

    return NextResponse.json(
      { error: 'AI analysis failed', details: String(error) },
      { status: 500 }
    )
  }
}
