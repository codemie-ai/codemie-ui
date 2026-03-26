import { ReactNode } from 'react'

import { cn } from '@/utils/utils'

interface DetailsBadgeProps {
  value: string | number | boolean
  icon?: ReactNode
  filled?: boolean
  className?: string
}

const DetailsBadge = ({ value, icon, filled = false, className }: DetailsBadgeProps) => {
  return (
    <div
      className={cn(
        'py-1.5 px-2 flex items-center gap-2 rounded-lg border border-border-specific-panel-outline font-semibold bg-surface-base-secondary',
        filled && 'bg-surface-base-secondary-tertiary',
        className
      )}
    >
      {icon} {String(value)}
    </div>
  )
}

export default DetailsBadge
