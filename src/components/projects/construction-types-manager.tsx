'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import type { ConstructionType, ConstructionPart } from '@/types'

interface Props {
  projectId: string
  initialTypes: (ConstructionType & { construction_parts: ConstructionPart[] })[]
}

export function ConstructionTypesManager({ projectId, initialTypes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [types, setTypes] = useState(initialTypes)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const [newTypeName, setNewTypeName] = useState('')
  const [newPartNames, setNewPartNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  function toggleExpand(typeId: string) {
    setExpandedTypes(prev => {
      const next = new Set(prev)
      if (next.has(typeId)) next.delete(typeId)
      else next.add(typeId)
      return next
    })
  }

  async function addType() {
    if (!newTypeName.trim()) return
    setLoading(true)

    const { data, error } = await supabase
      .from('construction_types')
      .insert({ project_id: projectId, name: newTypeName.trim(), sort_order: types.length })
      .select()
      .single()

    if (error) {
      toast.error('工種の追加に失敗しました')
    } else {
      setTypes([...types, { ...data, construction_parts: [] }])
      setNewTypeName('')
      toast.success('工種を追加しました')
    }
    setLoading(false)
  }

  async function deleteType(typeId: string) {
    const { error } = await supabase
      .from('construction_types')
      .delete()
      .eq('id', typeId)

    if (error) {
      toast.error('削除に失敗しました')
    } else {
      setTypes(types.filter(t => t.id !== typeId))
      toast.success('工種を削除しました')
    }
  }

  async function addPart(typeId: string) {
    const name = newPartNames[typeId]?.trim()
    if (!name) return
    setLoading(true)

    const type = types.find(t => t.id === typeId)
    const { data, error } = await supabase
      .from('construction_parts')
      .insert({ type_id: typeId, name, sort_order: (type?.construction_parts?.length ?? 0) })
      .select()
      .single()

    if (error) {
      toast.error('部位の追加に失敗しました')
    } else {
      setTypes(types.map(t =>
        t.id === typeId
          ? { ...t, construction_parts: [...(t.construction_parts ?? []), data] }
          : t
      ))
      setNewPartNames({ ...newPartNames, [typeId]: '' })
      toast.success('部位を追加しました')
    }
    setLoading(false)
  }

  async function deletePart(typeId: string, partId: string) {
    const { error } = await supabase
      .from('construction_parts')
      .delete()
      .eq('id', partId)

    if (error) {
      toast.error('削除に失敗しました')
    } else {
      setTypes(types.map(t =>
        t.id === typeId
          ? { ...t, construction_parts: t.construction_parts.filter(p => p.id !== partId) }
          : t
      ))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">工種・部位マスタ管理</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 工種追加 */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="工種名を入力（例: 基礎工、配筋工）"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addType()}
          />
          <Button onClick={addType} disabled={loading || !newTypeName.trim()} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            工種追加
          </Button>
        </div>

        {types.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
            <p className="text-sm">工種を追加してください</p>
            <p className="text-xs mt-1 text-gray-400">例: 基礎工、配筋工、型枠工、コンクリート工</p>
          </div>
        ) : (
          <div className="space-y-2">
            {types.map((type) => (
              <div key={type.id} className="border rounded-lg overflow-hidden">
                {/* 工種ヘッダー */}
                <div className="flex items-center gap-2 p-3 bg-gray-50">
                  <button
                    onClick={() => toggleExpand(type.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {expandedTypes.has(type.id)
                      ? <ChevronDown className="h-4 w-4 text-gray-400" />
                      : <ChevronRight className="h-4 w-4 text-gray-400" />
                    }
                    <span className="font-medium text-gray-900">{type.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {type.construction_parts?.length ?? 0}部位
                    </Badge>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-600 h-7 w-7 p-0"
                    onClick={() => deleteType(type.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* 部位一覧 */}
                {expandedTypes.has(type.id) && (
                  <div className="p-3 pl-8 space-y-2">
                    {(type.construction_parts ?? []).map((part) => (
                      <div key={part.id} className="flex items-center justify-between py-1.5 px-3 bg-white border rounded-md">
                        <span className="text-sm text-gray-700">{part.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-600 h-6 w-6 p-0"
                          onClick={() => deletePart(type.id, part.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {/* 部位追加 */}
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="部位名を入力（例: 1階柱、北側壁）"
                        value={newPartNames[type.id] ?? ''}
                        onChange={(e) => setNewPartNames({ ...newPartNames, [type.id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && addPart(type.id)}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addPart(type.id)}
                        disabled={loading || !newPartNames[type.id]?.trim()}
                        className="flex-shrink-0 h-8"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        部位追加
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
