// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import React from 'react'

import PinFilledSvg from '@/assets/icons/pin-filled.svg?react'
import PinOutlineSvg from '@/assets/icons/pin-outline.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

interface PinAssistantButtonProps {
  isPinned: boolean
  onToggle: () => void
  loading?: boolean
  className?: string
}

const PinAssistantButton: React.FC<PinAssistantButtonProps> = ({
  isPinned,
  onToggle,
  loading = false,
  className,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!loading) onToggle()
  }

  return (
    <Button
      type={ButtonType.TERTIARY}
      aria-label={isPinned ? 'Unpin assistant' : 'Pin assistant'}
      onClick={handleClick}
      disabled={loading}
      className={cn('p-1 !pl-1 hover:bg-surface-interactive-hover', className)}
    >
      {isPinned ? (
        <PinFilledSvg className="w-[18px] h-[18px] text-text-accent" aria-hidden="true" />
      ) : (
        <PinOutlineSvg className="w-[18px] h-[18px]" aria-hidden="true" />
      )}
    </Button>
  )
}

export default PinAssistantButton
