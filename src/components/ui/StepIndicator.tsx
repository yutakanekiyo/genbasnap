import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  steps: string[]
  current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
              i + 1 < current ? 'bg-blue-600 text-white' :
              i + 1 === current ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-200 text-gray-400'
            )}>
              {i + 1 < current ? '✓' : i + 1}
            </div>
            <span className={cn(
              'text-xs font-medium',
              i + 1 === current ? 'text-blue-600' : 'text-gray-400'
            )}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn(
              'w-12 h-0.5 mb-5 rounded',
              i + 1 < current ? 'bg-blue-600' : 'bg-gray-200'
            )} />
          )}
        </div>
      ))}
    </div>
  )
}
