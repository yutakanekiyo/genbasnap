'use client'

import { BigButton } from '@/components/ui/BigButton'

interface SuccessScreenProps {
  message: string
  primaryLabel: string
  primaryAction: () => void
  secondaryLabel?: string
  secondaryAction?: () => void
}

export function SuccessScreen({ message, primaryLabel, primaryAction, secondaryLabel, secondaryAction }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-bounce-once">
        <span className="text-5xl">✓</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-2">{message}</p>
      <div className="w-full max-w-xs mt-10 space-y-3">
        <BigButton onClick={primaryAction}>{primaryLabel}</BigButton>
        {secondaryLabel && secondaryAction && (
          <BigButton variant="secondary" onClick={secondaryAction}>{secondaryLabel}</BigButton>
        )}
      </div>
    </div>
  )
}
