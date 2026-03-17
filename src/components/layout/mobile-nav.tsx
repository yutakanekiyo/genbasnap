'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FolderOpen, Images, FileText, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'ホーム', icon: LayoutDashboard },
  { href: '/projects', label: 'プロジェクト', icon: FolderOpen },
  { href: '/photos', label: '写真', icon: Images },
  { href: '/ledger', label: '台帳', icon: FileText },
  { href: '/schedule', label: '工程', icon: BarChart3 },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-orange-500' : 'text-gray-500'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
