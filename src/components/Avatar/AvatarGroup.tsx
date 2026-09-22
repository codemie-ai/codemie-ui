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

import { AvatarType } from '@/constants/avatar'
import { cn } from '@/utils/utils'

import Avatar from './Avatar'

interface AvatarGroupProps {
  iconUrls: (string | null | undefined)[]
  names?: (string | undefined)[]
  maxVisible?: number
  className?: string
}

const AvatarGroup: FC<AvatarGroupProps> = ({ iconUrls, names = [], maxVisible = 3, className }) => {
  const avatarCount = Math.max(iconUrls.length, names.length, 1)
  const visibleCount = Math.min(avatarCount, maxVisible)
  const extra = Math.max(avatarCount - maxVisible, 0)
  const keyOccurrences = new Map<string, number>()
  const visibleAvatars = Array.from({ length: visibleCount }, (_, index) => {
    const iconUrl = iconUrls[index]
    const name = names[index]
    const identity = JSON.stringify([iconUrl ?? null, name ?? null])
    const occurrence = keyOccurrences.get(identity) ?? 0

    keyOccurrences.set(identity, occurrence + 1)

    return { key: `${identity}:${occurrence}`, iconUrl, name }
  })

  return (
    <div className={cn('flex items-center shrink-0', className)}>
      {visibleAvatars.map(({ key, iconUrl, name }, index) => (
        <Avatar
          key={key}
          iconUrl={iconUrl}
          name={name}
          type={AvatarType.XS}
          className={cn('ring-1 ring-surface-base-secondary', index > 0 && '-ml-1.5')}
        />
      ))}
      {extra > 0 && (
        <div className="-ml-1.5 size-6 min-w-6 rounded-full bg-surface-base-secondary border border-border-structural ring-1 ring-surface-base-secondary flex items-center justify-center text-[10px] font-medium text-text-secondary">
          +{extra}
        </div>
      )}
    </div>
  )
}

export default AvatarGroup
