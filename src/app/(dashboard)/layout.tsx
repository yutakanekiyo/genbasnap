import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { BottomTabBar } from '@/components/layout/bottom-tab-bar'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* PC用サイドバー */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar />
      </div>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* モバイル用ボトムタブ */}
      <BottomTabBar />
      <Toaster richColors position="top-center" />
    </div>
  )
}
