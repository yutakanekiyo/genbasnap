import { BigButton } from './BigButton'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {icon && <div className="text-gray-300 mb-6">{icon}</div>}
      <p className="text-xl font-bold text-gray-700">{title}</p>
      {description && <p className="text-base text-gray-500 mt-2 max-w-xs">{description}</p>}
      {actionLabel && onAction && (
        <div className="mt-8 w-full max-w-xs">
          <BigButton onClick={onAction}>{actionLabel}</BigButton>
        </div>
      )}
    </div>
  )
}
