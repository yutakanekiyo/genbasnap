'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BigButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  loading?: boolean
  loadingText?: string
}

export function BigButton({
  variant = 'primary',
  loading = false,
  loadingText,
  children,
  className,
  disabled,
  ...props
}: BigButtonProps) {
  const base = 'w-full min-h-[56px] rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] select-none'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50',
    secondary: 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 disabled:opacity-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
  }

  return (
    <button
      className={cn(base, variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {loadingText ?? '処理中...'}
        </>
      ) : children}
    </button>
  )
}
