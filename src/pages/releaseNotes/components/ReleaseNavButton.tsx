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

import { FC } from 'react'

import { formatDateTime } from '@/utils/helpers'
import { cn } from '@/utils/utils'

import { Release } from '../types'
import { CopyReleaseLinkButton } from './CopyReleaseLinkButton'

interface ReleaseNavButtonProps {
  release: Release
  isSelected: boolean
  onSelect: (version: string) => void
}

export const ReleaseNavButton: FC<ReleaseNavButtonProps> = ({ release, isSelected, onSelect }) => (
  <div className="group relative">
    <button
      type="button"
      aria-current={isSelected ? 'page' : undefined}
      aria-label={`Select release ${release.version}`}
      onClick={() => onSelect(release.version)}
      className={cn(
        'flex flex-col items-start w-full px-4 py-2 pr-12 text-left rounded-md transition-colors',
        'hover:bg-surface-specific-dropdown-hover',
        isSelected && 'bg-surface-specific-dropdown-hover'
      )}
    >
      <span className="text-sm font-semibold leading-5 text-text-primary font-geist-mono">
        {release.version}
      </span>
      {release.date && (
        <span className="text-xs leading-4 text-text-quaternary font-geist-mono">
          {formatDateTime(release.date, 'day')}
        </span>
      )}
    </button>
    <CopyReleaseLinkButton
      version={release.version}
      scope="sidebar"
      className={cn(
        'absolute right-2 top-1/2 -translate-y-1/2',
        isSelected
          ? 'opacity-100'
          : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto'
      )}
    />
  </div>
)
