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

import { FloatingPortal } from '@floating-ui/react'
import { CSSProperties, FC } from 'react'


import Avatar from '@/components/Avatar/Avatar'
import { AvatarType } from '@/constants/avatar'
import { type ResolvedChatAvatar } from '@/pages/chat/hooks/useChatItemAvatar'
import { type ChatListItem } from '@/types/entity/conversation'
import { formatDate } from '@/utils/helpers'

const buildTooltipEntries = (
  chat: ChatListItem,
  resolvedIconUrl: string | null,
  resolvedName: string | undefined,
  groupAvatars: ResolvedChatAvatar[],
  isImportChat: boolean
) => {
  if (chat.isWorkflow) {
    return [
      {
        key: `workflow:${chat.initialWorkflowId ?? chat.id}`,
        iconUrl: resolvedIconUrl,
        name: resolvedName,
        type: 'Workflow' as const,
      },
    ]
  }

  if (chat.isGroup) {
    const keyOccurrences = new Map<string, number>()

    return groupAvatars.flatMap((avatar, index) => {
      if (!avatar.name) return []

      const identity =
        chat.assistantIds?.[index] ?? JSON.stringify([avatar.iconUrl ?? null, avatar.name ?? null])
      const occurrence = keyOccurrences.get(identity) ?? 0

      keyOccurrences.set(identity, occurrence + 1)

      return [
        {
          ...avatar,
          key: `assistant:${identity}:${occurrence}`,
          type: isImportChat ? undefined : ('Assistant' as const),
        },
      ]
    })
  }

  return [
    {
      key: `assistant:${chat.initialAssistantId ?? chat.id}`,
      iconUrl: resolvedIconUrl,
      name: resolvedName,
      type: isImportChat ? undefined : ('Assistant' as const),
    },
  ]
}

interface ChatListItemTooltipProps {
  floatingRef: (node: HTMLElement | null) => void
  floatingStyles: CSSProperties
  getFloatingProps: () => Record<string, unknown>
  chatName: string
  chat: ChatListItem
  resolvedIconUrl: string | null
  resolvedName: string | undefined
  groupAvatars: ResolvedChatAvatar[]
  isImportChat: boolean
}

const ChatListItemTooltip: FC<ChatListItemTooltipProps> = ({
  floatingRef,
  floatingStyles,
  getFloatingProps,
  chatName,
  chat,
  resolvedIconUrl,
  resolvedName,
  groupAvatars,
  isImportChat,
}) => {
  const tooltipEntries = buildTooltipEntries(
    chat,
    resolvedIconUrl,
    resolvedName,
    groupAvatars,
    isImportChat
  )

  return (
    <FloatingPortal>
      <div
        ref={floatingRef}
        style={floatingStyles}
        {...(getFloatingProps() as React.HTMLAttributes<HTMLDivElement>)}
        className="z-50 flex w-80 max-w-full pointer-events-none flex-col gap-4 rounded-lg border border-border-primary bg-surface-base-secondary py-2 text-text-primary shadow-lg"
      >
        <h3 className="px-3 m-0 text-base font-semibold truncate">{chatName}</h3>

        <ul className="list-none m-0 px-3 py-0 flex flex-col gap-3">
          {tooltipEntries.map((entry) => (
            <li key={entry.key} className="flex items-center justify-between gap-4 leading-loose">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar
                  iconUrl={entry.iconUrl}
                  name={entry.name}
                  type={AvatarType.XS}
                  className="shrink-0"
                />
                <span className="truncate text-sm text-text-primary">{entry.name}</span>
              </div>
              <span className="text-sm text-text-quaternary shrink-0">{entry.type}</span>
            </li>
          ))}
        </ul>

        {chat.date && (
          <div className="flex flex-col gap-4">
            <hr className="mx-3 border-0 border-t border-border-primary" />
            <dl className="m-0 px-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs leading-relaxed">
              <dt className="text-text-quaternary">Created</dt>
              <dd className="m-0 text-text-quaternary text-right">
                {formatDate(chat.date, 'dd LLL yyyy, HH:mm')}
              </dd>
              {chat.updateDate && (
                <>
                  <dt className="text-text-quaternary">Last updated</dt>
                  <dd className="m-0 text-text-quaternary text-right">
                    {formatDate(chat.updateDate, 'dd LLL yyyy, HH:mm')}
                  </dd>
                </>
              )}
            </dl>
          </div>
        )}
      </div>
    </FloatingPortal>
  )
}

export default ChatListItemTooltip
