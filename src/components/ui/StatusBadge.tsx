import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'confirmed' | 'analyzed' | 'pending'

const config: Record<Status, { label: string; icon: typeof CheckCircle2; className: string }> = {
  confirmed: { label: '確認済み', icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
  analyzed: { label: '未確認', icon: Clock, className: 'bg-yellow-100 text-yellow-700' },
  pending: { label: 'よみとり中', icon: Clock, className: 'bg-gray-100 text-gray-600' },
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { label, icon: Icon, className: c } = config[status] ?? config.pending
  return (
    <span className={cn('inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium', c, className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}
