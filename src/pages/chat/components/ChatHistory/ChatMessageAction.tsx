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

import { ComponentProps, FC, SVGProps } from 'react'

import { cn } from '@/utils/utils'

interface ChatMessageActionProps {
  href?: string
  label: string
  icon: FC<SVGProps<SVGSVGElement>>
  iconClassName?: string
  className?: string | boolean
  isDisabled?: boolean
  onClick?: () => void
}

const ChatMessageAction: FC<ChatMessageActionProps> = ({
  label,
  href,
  icon: Icon,
  iconClassName,
  className,
  isDisabled = false,
  onClick,
}) => {
  const icon = <Icon className={cn('w-3.5 h-3.5', iconClassName)} />
  const props = {
    'aria-label': label,
    'data-tooltip-id': 'react-tooltip',
    'data-tooltip-delay-show': 200,
    'data-tooltip-content': label,
    'data-tooltip-place': 'top',
    className: cn(
      'opacity-80 transition size-5 min-w-5 flex justify-center items-center',
      'hover:opacity-100 active:opacity-100',
      isDisabled && 'opacity-50 cursor-not-allowed',
      className
    ),
  } satisfies ComponentProps<'button'>

  return href ? (
    <a
      {...props}
      role="link"
      aria-disabled={isDisabled}
      href={isDisabled ? '' : href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault()
        } else {
          onClick?.()
        }
      }}
    >
      {icon}
    </a>
  ) : (
    <button {...props} onClick={onClick} disabled={isDisabled} type="button">
      {icon}
    </button>
  )
}

export default ChatMessageAction
