'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { BigButton } from '@/components/ui/BigButton'
import { User, Building2, Users, ChevronRight, Loader2, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

type Section = null | 'profile' | 'organization' | 'members'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [section, setSection] = useState<Section>(null)

  const [orgName, setOrgName] = useState('')
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [orgId, setOrgId] = useState('')
  const [userRole, setUserRole] = useState('')

  const [members, setMembers] = useState<{
    id: string; name: string; email: string; role: string
  }[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)
      setUserEmail(user.email ?? '')

      const { data: userData } = await supabase
        .from('users')
        .select('*, organizations(*)')
        .eq('id', user.id)
        .single()

      if (userData) {
        setUserName(userData.name)
        setUserRole(userData.role)
        setOrgId(userData.org_id)
        const org = userData.organizations as { name?: string } | null
        setOrgName(org?.name ?? '')

        const { data: memberData } = await supabase
          .from('users')
          .select('id, name, email, role, created_at')
          .eq('org_id', userData.org_id)
          .order('created_at')
        setMembers(memberData ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.from('users').update({ name: userName }).eq('id', currentUserId)
    if (error) toast.error('保存に失敗しました')
    else { toast.success('プロフィールを更新しました'); setSection(null) }
    setSaving(false)
  }

  async function saveOrg() {
    if (userRole !== 'admin') { toast.error('管理者のみ変更できます'); return }
    setSaving(true)
    const { error } = await supabase.from('organizations').update({ name: orgName }).eq('id', orgId)
    if (error) toast.error('保存に失敗しました')
    else { toast.success('会社情報を更新しました'); setSection(null) }
    setSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const roleLabels: Record<string, string> = {
    admin: '管理者',
    manager: 'マネージャー',
    member: 'メンバー',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // サブセクション表示
  if (section === 'profile') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSection(null)} className="text-blue-600 font-medium text-base">← もどる</button>
          <p className="text-xl font-bold text-gray-900">プロフィール</p>
        </div>
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-500">メールアドレス</p>
            <p className="text-base text-gray-900">{userEmail}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-500">氏名</p>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="山田 太郎"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-500">権限</p>
            <p className="text-base text-gray-900">{roleLabels[userRole] ?? userRole}</p>
          </div>
        </div>
        <BigButton onClick={saveProfile} loading={saving} loadingText="保存中...">
          変更を保存する
        </BigButton>
      </div>
    )
  }

  if (section === 'organization') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSection(null)} className="text-blue-600 font-medium text-base">← もどる</button>
          <p className="text-xl font-bold text-gray-900">会社情報</p>
        </div>
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-500">会社名</p>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="株式会社○○建設"
              disabled={userRole !== 'admin'}
              className="h-12 text-base"
            />
            {userRole !== 'admin' && (
              <p className="text-sm text-gray-400">管理者のみ変更できます</p>
            )}
          </div>
        </div>
        {userRole === 'admin' && (
          <BigButton onClick={saveOrg} loading={saving} loadingText="保存中...">
            変更を保存する
          </BigButton>
        )}
      </div>
    )
  }

  if (section === 'members') {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSection(null)} className="text-blue-600 font-medium text-base">← もどる</button>
          <p className="text-xl font-bold text-gray-900">メンバー</p>
        </div>
        <div className="bg-white rounded-2xl overflow-hidden">
          {members.map((member, i) => (
            <div
              key={member.id}
              className={cn('flex items-center px-5 py-4 gap-4', i > 0 && 'border-t border-gray-100')}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500 truncate">{member.email}</p>
              </div>
              <span className="text-sm font-medium text-gray-500 flex-shrink-0">
                {roleLabels[member.role] ?? member.role}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-400 text-center">メンバーの招待は管理画面から行えます</p>
      </div>
    )
  }

  // メインリスト
  const menuItems = [
    {
      icon: User,
      label: 'プロフィール',
      sub: userName,
      color: 'bg-blue-100',
      iconColor: 'text-blue-600',
      onPress: () => setSection('profile'),
    },
    {
      icon: Building2,
      label: '会社情報',
      sub: orgName,
      color: 'bg-green-100',
      iconColor: 'text-green-600',
      onPress: () => setSection('organization'),
    },
    {
      icon: Users,
      label: 'メンバー一覧',
      sub: `${members.length}人`,
      color: 'bg-purple-100',
      iconColor: 'text-purple-600',
      onPress: () => setSection('members'),
    },
  ]

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <p className="text-2xl font-bold text-gray-900">設定</p>

      <div className="bg-white rounded-2xl overflow-hidden">
        {menuItems.map((item, i) => (
          <button
            key={item.label}
            onClick={item.onPress}
            className={cn(
              'w-full flex items-center gap-4 px-5 py-4 active:bg-gray-50 text-left',
              i > 0 && 'border-t border-gray-100'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', item.color)}>
              <item.icon className={cn('h-5 w-5', item.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-gray-900">{item.label}</p>
              {item.sub && <p className="text-sm text-gray-500 truncate">{item.sub}</p>}
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 px-5 py-4 active:bg-gray-50 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <LogOut className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-base font-bold text-red-600">ログアウト</p>
        </button>
      </div>

      <p className="text-center text-sm text-gray-400">GenbaSnap v1.0</p>
    </div>
  )
}
