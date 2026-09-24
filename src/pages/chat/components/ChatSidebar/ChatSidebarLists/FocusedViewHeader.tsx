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

import { ChangeEvent, FC } from 'react'

import ChevronLeftSvg from '@/assets/icons/chevron-left.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import SearchSvg from '@/assets/icons/search.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import Button from '@/components/Button'
import Input from '@/components/form/Input'
import { AvatarType } from '@/constants/avatar'
import { resolveChatAvatar, useAvatarStores } from '@/pages/chat/hooks/useChatItemAvatar'

import { FocusedChatSidebarAggregate, getFolderDisplayName } from './chatSidebarListsHelpers'
import { resolveFocusedAggregateAvatars } from './focusedAggregateAvatars'
import FolderTypeIcon from '../FolderTypeIcon'

interface FocusedViewHeaderProps {
  aggregate: FocusedChatSidebarAggregate
  conversationCount?: number
  searchQuery: string
  onBack: () => void
  onNewChat: () => void
  onSearchChange: (value: string) => void
}

const FocusedViewHeader: FC<FocusedViewHeaderProps> = ({
  aggregate,
  conversationCount = aggregate.chats.length,
  searchQuery,
  onBack,
  onNewChat,
  onSearchChange,
}) => {
  const avatarStores = useAvatarStores()
  const avatarItems = resolveFocusedAggregateAvatars(aggregate.chats, avatarStores)
  const isImportFolder =
    aggregate.folderKind === 'import' || aggregate.folderKind === 'legacy-import'
  const displayName = isImportFolder ? getFolderDisplayName(aggregate.id) : aggregate.name.trim()
  const primaryAvatar =
    avatarItems[0] ??
    (aggregate.latestChat
      ? resolveChatAvatar(aggregate.latestChat, avatarStores)
      : { iconUrl: aggregate.iconUrl ?? null, name: displayName })
  const searchLabel =
    aggregate.kind === 'assistant' ? `Search in ${displayName} chats` : `Search in ${displayName}`
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value)
  }

  return (
    <div className="flex shrink-0 flex-col gap-4 px-2 pb-4">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 flex w-fit shrink-0 items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-specific-dropdown-hover"
        >
          <ChevronLeftSvg aria-hidden="true" className="size-4" />
          All chats
        </button>

        {!isImportFolder && (
          <Button
            variant="primary"
            size="medium"
            className="shrink-0 whitespace-nowrap rounded-lg"
            onClick={onNewChat}
          >
            <PlusSvg aria-hidden="true" />
            New chat
          </Button>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {aggregate.kind === 'folder' ? (
          <FolderTypeIcon kind={aggregate.folderKind ?? 'custom'} />
        ) : (
          <Avatar
            iconUrl={primaryAvatar.iconUrl}
            name={primaryAvatar.name ?? displayName}
            type={AvatarType.XS}
            className="shrink-0"
          />
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">{displayName}</p>
          <p className="text-xs text-text-tertiary">
            {conversationCount} {conversationCount === 1 ? 'conversation' : 'conversations'}
          </p>
        </div>
      </div>

      <Input
        id="focused-chat-search"
        name="focused-chat-search"
        value={searchQuery}
        placeholder={searchLabel}
        aria-label={searchLabel}
        title={searchLabel}
        leftIcon={<SearchSvg aria-hidden="true" className="size-4 text-text-tertiary" />}
        rootClass="gap-0"
        containerClass="min-h-10 max-h-10 rounded-none border-x-0 border-t-0 bg-transparent"
        inputClass="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
        onChange={handleSearchChange}
      />
    </div>
  )
}

export default FocusedViewHeader
