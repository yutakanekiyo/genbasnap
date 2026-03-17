'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Camera, HardHat, Settings } from 'lucide-react'

const tabs = [
  { href: '/dashboard', label: 'ホーム', icon: Home },
  { href: '/photos/upload', label: '撮る', icon: Camera },
  { href: '/projects', label: '現場', icon: HardHat },
  { href: '/settings', label: '設定', icon: Settings },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden pb-safe">
      <div className="flex h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'fill-current opacity-20')} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
