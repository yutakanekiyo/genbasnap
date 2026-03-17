'use client'

import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
  message?: string
  subMessage?: string
}

export function LoadingOverlay({ message = 'よみとり中...', subMessage = 'しばらくおまちください' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
      <p className="text-xl font-bold text-gray-900">{message}</p>
      <p className="text-base text-gray-500">{subMessage}</p>
    </div>
  )
}
