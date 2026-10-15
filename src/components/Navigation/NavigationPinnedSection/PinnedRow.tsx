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

import React, { useRef } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import { AvatarType } from '@/constants/avatar'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { cn } from '@/utils/utils'

import { NavSectionItem } from './NavigationPinnedSection'

const TOOLTIP_OFFSET_PAST_DELETE_BTN = 32

interface PinnedRowProps {
  item: NavSectionItem
  navigationExpanded: boolean
  onDelete: (e: React.MouseEvent) => void
}

const PinnedRow: React.FC<PinnedRowProps> = ({ item, navigationExpanded, onDelete }) => {
  const spanRef = useRef<HTMLSpanElement>(null)
  const isTruncated = useIsTruncated(spanRef)
  const showDelete = item.isDeletable && navigationExpanded

  return (
    <div className="relative group">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 px-2 py-1.5 rounded-lg h-9 text-left cursor-pointer',
          'hover:bg-white/15 transition-colors text-text-specific-navigation-link',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60',
          showDelete && 'pr-7'
        )}
        aria-label={item.name}
        data-tooltip-id={!navigationExpanded ? 'react-tooltip' : undefined}
        data-tooltip-content={!navigationExpanded ? item.name : undefined}
        data-tooltip-place="right"
        onClick={item.onClick}
      >
        <span className="flex-shrink-0">
          <Avatar iconUrl={item.icon_url} name={item.name} type={AvatarType.XS} />
        </span>
        <span
          ref={spanRef}
          className={cn(
            'text-sm truncate flex-1 min-w-0 transition-opacity duration-200 ease-in-out transform-gpu',
            navigationExpanded ? 'opacity-100' : 'opacity-0'
          )}
          data-tooltip-id={navigationExpanded ? 'react-tooltip' : undefined}
          data-tooltip-content={navigationExpanded && isTruncated ? item.name : ''}
          data-tooltip-place="right"
          data-tooltip-offset={TOOLTIP_OFFSET_PAST_DELETE_BTN}
        >
          {item.name}
        </span>
      </button>
      {showDelete && (
        <button
          type="button"
          aria-label={`Unpin ${item.name}`}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-[3px] rounded hover:bg-surface-interactive-hover transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
          onClick={onDelete}
        >
          <DeleteSvg className="w-4 h-4 text-icon-primary" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default PinnedRow
