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

import StarFilledSvg from '@/assets/icons/star-filled.svg?react'
import StarOutlineSvg from '@/assets/icons/star-outline.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

interface FavoriteButtonProps {
  isFavorited: boolean
  onToggle: () => void
  loading?: boolean
  className?: string
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorited,
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
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      onClick={handleClick}
      disabled={loading}
      className={cn('p-1 !pl-1 hover:bg-surface-interactive-hover', className)}
    >
      {isFavorited ? (
        <StarFilledSvg className="w-[18px] h-[18px] text-text-accent" aria-hidden="true" />
      ) : (
        <StarOutlineSvg className="w-[18px] h-[18px]" aria-hidden="true" />
      )}
    </Button>
  )
}

export default FavoriteButton
