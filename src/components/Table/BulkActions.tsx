import { FC, ReactNode } from 'react'

import CrossSvg from '@/assets/icons/cross.svg?react'
import { cn } from '@/utils/utils'

import Button from '../Button'

interface BulkActionsProps {
  selected: number
  total?: number
  onUnselect: () => void
  children?: ReactNode
  className?: string
}

const BulkActions: FC<BulkActionsProps> = ({
  selected,
  total,
  onUnselect,
  children,
  className,
}) => {
  if (selected === 0) return null

  const selectionText =
    total !== undefined ? `${selected} of ${total} selected` : `${selected} selected`

  return (
    <div
      className={cn(
        'inline-flex items-center py-1 px-1 bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg text-xs',
        className
      )}
    >
      <Button aria-label="Clear selection" variant="tertiary" className="mr-1" onClick={onUnselect}>
        <CrossSvg className="size-4" />
      </Button>
      <p className="font-medium text-text-primary tracking-tighter">{selectionText}</p>

      {children && (
        <>
          <div className="w-px h-3 bg-border-specific-panel-outline mx-3" />
          <div className="flex flex-wrap gap-1">{children}</div>
        </>
      )}
    </div>
  )
}

export default BulkActions
