'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Home, Camera, HardHat, FileText, Settings, LogOut } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'ホーム', icon: Home },
  { href: '/photos/upload', label: '撮る / 送る', icon: Camera },
  { href: '/projects', label: '現場一覧', icon: HardHat },
  { href: '/ledger', label: '台帳', icon: FileText },
  { href: '/settings', label: '設定', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      {/* ロゴ */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl text-gray-900">GenbaSnap</span>
        </Link>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors relative',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
              )}
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* ログアウト */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          ログアウト
        </button>
      </div>
    </aside>
  )
}
