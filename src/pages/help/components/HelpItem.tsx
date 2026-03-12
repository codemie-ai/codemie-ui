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

import { FC, useRef } from 'react'
import { Link } from 'react-router'

import ChatNewFilledSvg from '@/assets/icons/chat-new-filled.svg?react'
import ExternalSvg from '@/assets/icons/external.svg?react'
import DefaultIconPng from '@/assets/images/ai-avatar.png'
import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import { useIsTruncated } from '@/hooks/useIsTruncated'

import { HelpItemType } from '../HelpPage'

const HelpItem: FC<HelpItemType> = ({
  name,
  description,
  link,
  type = 'link',
  buttonText,
  iconUrl,
  icon: Icon,
  isExternal,
}) => {
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const isTruncated = useIsTruncated(descriptionRef)
  const finalButtonText = buttonText ?? (type === 'chat' ? 'Chat Now' : 'Explore')

  return (
    <Link
      to={link}
      target={isExternal ? '_blank' : ''}
      className="flex justify-between p-4 items-center border border-border-specific-panel-outline rounded-lg bg-surface-base-chat hover:bg-opacity-30 transition cursor-pointer hover:no-underline"
    >
      <div className="flex items-center gap-x-5">
        <div className="border flex justify-center items-center rounded-full size-8 min-w-8 min-h-8 overflow-hidden border-border-specific-icon-outline bg-surface-interactive-active">
          {iconUrl && <img src={iconUrl} alt={name} />}
          {!iconUrl && (Icon ? <Icon /> : <img src={DefaultIconPng} alt={name} />)}
        </div>
        <div className="flex flex-col pr-2">
          <h3 className="font-medium">{name}</h3>
          <p
            ref={descriptionRef}
            data-tooltip-id="react-tooltip"
            data-tooltip-place="bottom"
            data-tooltip-content={isTruncated ? description : ''}
            className="text-xs-1 text-text-quaternary line-clamp-2"
          >
            {description}
          </p>
        </div>
      </div>
      {isExternal ? (
        <a href={link} target="_blank" rel="noreferrer" className="hover:no-underline">
          <Button variant={ButtonType.SECONDARY}>
            <ExternalSvg />
            {finalButtonText}
          </Button>
        </a>
      ) : (
        <Button variant={ButtonType.SECONDARY}>
          {type === 'chat' ? <ChatNewFilledSvg /> : <ExternalSvg />}
          {finalButtonText}
        </Button>
      )}
    </Link>
  )
}

export default HelpItem
