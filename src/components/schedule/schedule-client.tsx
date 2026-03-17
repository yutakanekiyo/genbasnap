'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BarChart3, Plus, Edit2, Trash2, Calendar, GripVertical } from 'lucide-react'
import type { Schedule } from '@/types'

interface ScheduleWithType extends Omit<Schedule, 'construction_type'> {
  construction_type?: { name: string } | null
}

interface Props {
  projects: { id: string; name: string; start_date: string | null; end_date: string | null }[]
  schedules: ScheduleWithType[]
  initialProjectId?: string
}

export function ScheduleClient({ projects, schedules: initialSchedules, initialProjectId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedProject, setSelectedProject] = useState(initialProjectId ?? '')
  const [schedules, setSchedules] = useState(initialSchedules)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduleWithType | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
    progress: 0,
  })

  function handleProjectChange(projectId: string | null) {
    if (!projectId) return
    setSelectedProject(projectId)
    router.push(`/schedule?project=${projectId}`)
  }

  function openEdit(schedule: ScheduleWithType) {
    setEditingSchedule(schedule)
    setForm({
      name: schedule.name,
      planned_start: schedule.planned_start ?? '',
      planned_end: schedule.planned_end ?? '',
      actual_start: schedule.actual_start ?? '',
      actual_end: schedule.actual_end ?? '',
      progress: schedule.progress,
    })
  }

  async function saveSchedule() {
    if (!selectedProject || !form.name) return
    setSaving(true)

    if (editingSchedule) {
      const { error } = await supabase
        .from('schedules')
        .update({
          name: form.name,
          planned_start: form.planned_start || null,
          planned_end: form.planned_end || null,
          actual_start: form.actual_start || null,
          actual_end: form.actual_end || null,
          progress: form.progress,
        })
        .eq('id', editingSchedule.id)

      if (error) { toast.error('更新に失敗しました'); setSaving(false); return }
      setSchedules(schedules.map(s =>
        s.id === editingSchedule.id ? { ...s, ...form } : s
      ))
      setEditingSchedule(null)
    } else {
      const { data, error } = await supabase
        .from('schedules')
        .insert({
          project_id: selectedProject,
          name: form.name,
          planned_start: form.planned_start || null,
          planned_end: form.planned_end || null,
          actual_start: form.actual_start || null,
          actual_end: form.actual_end || null,
          progress: form.progress,
          sort_order: schedules.length,
        })
        .select()
        .single()

      if (error) { toast.error('追加に失敗しました'); setSaving(false); return }
      setSchedules([...schedules, data])
      setShowAddDialog(false)
    }

    setForm({ name: '', planned_start: '', planned_end: '', actual_start: '', actual_end: '', progress: 0 })
    toast.success('工程を保存しました')
    setSaving(false)
  }

  async function deleteSchedule(id: string) {
    const { error } = await supabase.from('schedules').delete().eq('id', id)
    if (error) { toast.error('削除に失敗しました'); return }
    setSchedules(schedules.filter(s => s.id !== id))
  }

  // ガントチャート描画
  const project = projects.find(p => p.id === selectedProject)
  const projectStart = project?.start_date ? new Date(project.start_date) : null
  const projectEnd = project?.end_date ? new Date(project.end_date) : null
  const totalDays = projectStart && projectEnd
    ? Math.max(1, Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  function getBarStyle(start: string | null, end: string | null) {
    if (!start || !end || !projectStart || totalDays === 0) return null
    const startDate = new Date(start)
    const endDate = new Date(end)
    const left = Math.max(0, (startDate.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100
    const width = Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) / totalDays * 100
    return { left: `${Math.min(left, 99)}%`, width: `${Math.min(width, 100 - left)}%` }
  }

  const FormContent = () => (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>工程名 *</Label>
        <Input
          placeholder="例: 基礎工事"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>予定開始</Label>
          <Input type="date" value={form.planned_start} onChange={e => setForm({ ...form, planned_start: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>予定終了</Label>
          <Input type="date" value={form.planned_end} onChange={e => setForm({ ...form, planned_end: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>実績開始</Label>
          <Input type="date" value={form.actual_start} onChange={e => setForm({ ...form, actual_start: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>実績終了</Label>
          <Input type="date" value={form.actual_end} onChange={e => setForm({ ...form, actual_end: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>進捗率: {form.progress}%</Label>
        <input
          type="range"
          min="0"
          max="100"
          value={form.progress}
          onChange={e => setForm({ ...form, progress: Number(e.target.value) })}
          className="w-full"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={() => { setShowAddDialog(false); setEditingSchedule(null) }}>
          キャンセル
        </Button>
        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={saveSchedule} disabled={saving || !form.name}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工程管理</h1>
          <p className="text-gray-500 mt-1">工事スケジュール・ガントチャート</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700" disabled={!selectedProject}><Plus className="h-4 w-4 mr-1" />工程追加</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>工程を追加</DialogTitle></DialogHeader>
            <FormContent />
          </DialogContent>
        </Dialog>
      </div>

      {/* プロジェクト選択 */}
      <div className="mb-4">
        <Select value={selectedProject} onValueChange={handleProjectChange}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="プロジェクトを選択" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProject ? (
        <div className="text-center py-20 text-gray-500">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">プロジェクトを選択してください</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">工程がありません</p>
          <p className="text-sm mt-2">「工程追加」から工程を登録してください</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 text-xs font-medium text-gray-500 w-36">工程名</th>
                  <th className="text-left p-3 text-xs font-medium text-gray-500 w-24">進捗率</th>
                  {totalDays > 0 ? (
                    <th className="p-3 text-xs font-medium text-gray-500">
                      ガントチャート
                      <span className="text-xs font-normal ml-2 text-gray-400">
                        {project?.start_date} 〜 {project?.end_date}
                      </span>
                    </th>
                  ) : (
                    <th className="p-3 text-xs font-medium text-gray-500">予定期間</th>
                  )}
                  <th className="p-3 text-xs font-medium text-gray-500 w-20">操作</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                  const plannedBar = getBarStyle(schedule.planned_start, schedule.planned_end)
                  const actualBar = getBarStyle(schedule.actual_start, schedule.actual_end)
                  return (
                    <tr key={schedule.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <p className="font-medium text-gray-900 text-sm">{schedule.name}</p>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Progress value={schedule.progress} className="h-2 flex-1" />
                          <span className="text-xs text-gray-600 w-8">{schedule.progress}%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {totalDays > 0 && plannedBar ? (
                          <div className="relative h-10">
                            {/* 予定バー */}
                            <div
                              className="absolute h-4 bg-blue-200 rounded-sm top-0"
                              style={plannedBar}
                              title={`予定: ${schedule.planned_start} 〜 ${schedule.planned_end}`}
                            />
                            {/* 実績バー */}
                            {actualBar && (
                              <div
                                className="absolute h-4 bg-green-400 rounded-sm top-5"
                                style={actualBar}
                                title={`実績: ${schedule.actual_start} 〜 ${schedule.actual_end}`}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            {schedule.planned_start && schedule.planned_end
                              ? `${schedule.planned_start} 〜 ${schedule.planned_end}`
                              : '未設定'}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Dialog open={editingSchedule?.id === schedule.id} onOpenChange={(open) => !open && setEditingSchedule(null)}>
                            <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(schedule)}><Edit2 className="h-3.5 w-3.5 text-gray-400" /></Button>} />
                            <DialogContent>
                              <DialogHeader><DialogTitle>工程を編集</DialogTitle></DialogHeader>
                              <FormContent />
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteSchedule(schedule.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {totalDays > 0 && (
              <div className="px-3 py-2 border-t bg-gray-50 flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-blue-200 rounded-sm" />予定
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-green-400 rounded-sm" />実績
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
