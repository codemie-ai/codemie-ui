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

import React, { useMemo } from 'react'

import aiAvatarImage from '@/assets/images/ai-avatar.png'
import Tooltip from '@/components/Tooltip'
import { AvatarType } from '@/constants/avatar'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { generateAssistantAvatarDataUrl } from '@/utils/assistantAvatar'
import { cn } from '@/utils/utils'

export interface AvatarProps {
  iconUrl?: string | null
  name?: string
  type?: AvatarType
  className?: string
  withTooltip?: boolean
  onClick?: () => void
}

const Avatar: React.FC<AvatarProps> = ({
  iconUrl,
  name,
  type = AvatarType.CHAT,
  className = '',
  withTooltip = false,
  onClick,
}) => {
  const [isGeneratedAvatarsEnabled] = useFeatureFlag('features:generatedAssistantIcons')

  const avatarSizeClasses = useMemo(() => {
    switch (type) {
      case AvatarType.MODAL:
        return 'border-2 w-44 h-44 min-w-44 min-h-44' // 175px
      case AvatarType.MEDIUM:
        return 'border-2 w-[4.5rem] h-[4.5rem] min-w-[4.5rem] min-h-[4.5rem]' // 72px
      case AvatarType.CHAT:
        return 'min-w-10 size-10 border-1'
      case AvatarType.SMALL:
        return 'border-1 size-8 min-w-8' // 32px
      case AvatarType.XS:
        return 'border-1 size-6 min-w-6'
      case AvatarType.DROPDOWN:
        return 'border min-w-5 size-5'
      default:
        return 'border-2 w-24 h-24 min-w-24 min-h-24'
    }
  }, [type])

  const classNames = cn(
    'rounded-full border-border-specific-assistant-avatar bg-white/90 chat-header-assistant',
    onClick && 'cursor-pointer',
    avatarSizeClasses,
    className
  )

  const fallbackIcon = isGeneratedAvatarsEnabled
    ? generateAssistantAvatarDataUrl(name ?? '')
    : aiAvatarImage

  const icon = iconUrl || fallbackIcon
  const tooltip = withTooltip ? name || 'Avatar' : ''

  return (
    <>
      <Tooltip target=".chat-header-assistant" delay={0} />
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={tooltip}
          data-tooltip-id="react-tooltip"
          data-tooltip-content={tooltip}
          className={classNames}
        >
          <img src={icon} alt="" className="w-full h-full object-cover rounded-full" />
        </button>
      ) : (
        <img
          src={icon}
          alt={tooltip}
          data-tooltip-id="react-tooltip"
          data-tooltip-content={tooltip}
          className={classNames}
        />
      )}
    </>
  )
}

Avatar.displayName = 'Avatar'

export default React.memo(Avatar)
