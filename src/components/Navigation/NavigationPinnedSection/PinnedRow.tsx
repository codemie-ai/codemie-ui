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

interface PinnedRowProps {
  item: NavSectionItem
  onDelete: (e: React.MouseEvent) => void
}

const PinnedRow: React.FC<PinnedRowProps> = ({ item, onDelete }) => {
  const spanRef = useRef<HTMLSpanElement>(null)
  const isTruncated = useIsTruncated(spanRef)

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group h-9',
        'hover:bg-white/15 transition-colors text-text-specific-navigation-label'
      )}
    >
      <button
        type="button"
        className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60"
        aria-label={item.name}
        onClick={item.onClick}
      />
      <span className="relative z-[1] flex-shrink-0">
        <Avatar iconUrl={item.icon_url} name={item.name} type={AvatarType.XS} />
      </span>
      <span
        ref={spanRef}
        className="text-sm truncate flex-1 relative z-[1] min-w-0"
        data-tooltip-id="react-tooltip"
        data-tooltip-content={isTruncated ? item.name : ''}
        data-tooltip-place="right"
      >
        {item.name}
      </span>
      {item.isDeletable && (
        <button
          type="button"
          aria-label={`Unpin ${item.name}`}
          className="relative z-[1] p-[3px] rounded hover:bg-surface-interactive-hover transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 focus:outline-none"
          onClick={onDelete}
        >
          <DeleteSvg className="w-4 h-4 text-icon-primary" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default PinnedRow
