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

import { cn } from '@/utils/utils'

interface OverflowButtonProps {
  count: number
  onToggle: () => void
  buttonRef: React.RefObject<HTMLButtonElement | null>
  isExpanded?: boolean
  className?: string
}

const OverflowButton: React.FC<OverflowButtonProps> = ({
  count,
  onToggle,
  buttonRef,
  isExpanded,
  className,
}) => (
  <button
    ref={buttonRef as React.RefObject<HTMLButtonElement>}
    type="button"
    aria-label={`Show ${count} more assistants`}
    aria-haspopup="menu"
    aria-expanded={isExpanded}
    className={cn(
      'w-[34px] h-8 rounded-lg',
      'text-[12px] text-text-primary font-medium',
      'flex items-center justify-center',
      'transition-colors',
      className
    )}
    onClick={(e) => {
      e.stopPropagation()
      onToggle()
    }}
  >
    +{count}
  </button>
)

export default OverflowButton
