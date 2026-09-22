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

import { FC, useState } from 'react'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import HistorySvg from '@/assets/icons/history.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import AvatarGroup from '@/components/Avatar/AvatarGroup'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import { useVueRouter } from '@/hooks/useVueRouter'
import { useAvatarStores } from '@/pages/chat/hooks/useChatItemAvatar'
import { chatsStore } from '@/store/chats'
import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem } from '@/types/entity/conversation'

import { FocusedChatSidebarAggregate, getFolderDisplayName } from './chatSidebarListsHelpers'
import { resolveFocusedAggregateAvatars } from './focusedAggregateAvatars'
import AddChatsToFolderPopup from '../AddChatsToFolderPopup'
import AssistantFolderDeletePopup from '../FolderList/AssistantFolderDeletePopup'
import DeleteFolderPopup from '../FolderList/DeleteFolderPopup'
import FolderFormPopup from '../FolderList/FolderFormPopup'
import FolderTypeIcon from '../FolderTypeIcon'

interface FocusedAggregateRowProps {
  aggregate: FocusedChatSidebarAggregate
  density: ChatListDensity
  onSelect: () => void
  onNewChat?: () => void
}

const DEFAULT_CHAT_NAMES = new Set(['New chat', 'Untitled chat'])

const getChatName = (chat: ChatListItem, entityName?: string) => {
  const chatName = chat.name?.trim()
  if (chatName && !chat.pendingRename && !DEFAULT_CHAT_NAMES.has(chatName)) return chatName
  return entityName?.trim() || chat.assistantNames?.[0]?.trim() || 'New chat'
}

const FocusedAggregateRow: FC<FocusedAggregateRowProps> = ({
  aggregate,
  density,
  onSelect,
  onNewChat,
}) => {
  const avatarStores = useAvatarStores()
  const router = useVueRouter()
  const [isAssistantDeletePopupVisible, setIsAssistantDeletePopupVisible] = useState(false)
  const [isAddChatsPopupVisible, setIsAddChatsPopupVisible] = useState(false)
  const [isRenamePopupVisible, setIsRenamePopupVisible] = useState(false)
  const [isCustomDeletePopupVisible, setIsCustomDeletePopupVisible] = useState(false)
  const isCompact = density === ChatListDensity.COMPACT
  const avatarItems = resolveFocusedAggregateAvatars(aggregate.chats, avatarStores)

  const isImportFolder =
    aggregate.folderKind === 'import' || aggregate.folderKind === 'legacy-import'
  const displayName = isImportFolder ? getFolderDisplayName(aggregate.id) : aggregate.name
  const iconKind = aggregate.kind === 'assistant' ? 'assistant' : aggregate.folderKind ?? 'custom'
  const showParticipantMetadata =
    !isCompact && !isImportFolder && (aggregate.kind === 'folder' || avatarItems.length > 1)

  const assistantMenuItems =
    aggregate.kind === 'assistant'
      ? [
          {
            title: 'New chat',
            icon: <PlusSvg className="icon" />,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              onNewChat?.()
            },
          },
          {
            title: 'View chat history',
            icon: <HistorySvg className="icon" />,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              onSelect()
            },
          },
          {
            title: 'Edit assistant',
            icon: <EditSvg className="icon" />,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              router.push({ name: 'edit-assistant', params: { id: aggregate.id } })
            },
          },
          {
            title: 'Delete...',
            icon: <DeleteSvg className="icon" />,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              setIsAssistantDeletePopupVisible(true)
            },
          },
        ]
      : []

  const isCustomOrWorkflowFolder =
    aggregate.folderKind === 'custom' || aggregate.folderKind === 'workflow'
  // A workflow-associated folder (EPMCDME-15012) is a run history, not a user-curated collection
  // — "Add chats..." doesn't apply. The old main behavior was to start a new chat with the
  // workflow directly; keep that, deriving the workflow id from any chat already in the folder
  // (they all share one, per isWorkflowAssociatedFolder's invariant).
  const workflowId =
    aggregate.folderKind === 'workflow' ? aggregate.chats[0]?.initialWorkflowId ?? null : null

  const firstFolderMenuItem =
    aggregate.folderKind === 'workflow' && workflowId
      ? {
          title: 'New chat',
          icon: <PlusSvg className="icon" />,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation()
            chatsStore.startNewChat(workflowId, aggregate.name, true).then(() => {
              router.push({ name: 'new-chat' })
            })
          },
        }
      : {
          title: 'Add chats...',
          icon: <PlusSvg className="icon" />,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation()
            setIsAddChatsPopupVisible(true)
          },
        }

  const customFolderMenuItems =
    aggregate.kind === 'folder' && isCustomOrWorkflowFolder
      ? [
          firstFolderMenuItem,
          {
            title: 'Rename folder',
            icon: <EditSvg className="icon" />,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              setIsRenamePopupVisible(true)
            },
          },
          {
            title: 'Delete...',
            icon: <DeleteSvg className="icon" />,
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation()
              setIsCustomDeletePopupVisible(true)
            },
          },
        ]
      : []

  const menuItems = assistantMenuItems.length > 0 ? assistantMenuItems : customFolderMenuItems

  return (
    <>
      <div className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-text-secondary transition-colors hover:bg-surface-specific-dropdown-hover hover:text-text-primary group">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 grow items-start gap-2 text-left"
        >
          <span className="flex h-6 shrink-0 items-center">
            <FolderTypeIcon kind={iconKind} />
          </span>

          <span className="min-w-0 grow">
            <span className="block truncate text-sm font-medium text-text-primary">
              {displayName}
            </span>
            {!isCompact && (
              <span className="block truncate text-xs text-text-tertiary">
                {aggregate.latestChat
                  ? `Last: ${getChatName(aggregate.latestChat, avatarItems[0]?.name)}`
                  : 'No chats yet'}
              </span>
            )}
          </span>

          {showParticipantMetadata && (
            <AvatarGroup
              iconUrls={avatarItems.map((avatar) => avatar.iconUrl)}
              names={avatarItems.map((avatar) => avatar.name)}
              className="shrink-0"
            />
          )}

          {!isCompact && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-xs text-text-tertiary">
              {aggregate.chats.length}
            </span>
          )}
        </button>

        {menuItems.length > 0 && (
          <NavigationMore
            renderInRoot
            placement="right-end"
            hideOnClickInside
            items={menuItems}
            className="h-6 shrink-0"
            buttonClassName="m-0 flex size-6 items-center justify-center p-0"
          />
        )}
      </div>

      {aggregate.kind === 'assistant' && (
        <AssistantFolderDeletePopup
          assistantId={aggregate.id}
          assistantName={aggregate.name}
          isVisible={isAssistantDeletePopupVisible}
          onHide={() => setIsAssistantDeletePopupVisible(false)}
        />
      )}

      {aggregate.kind === 'folder' && isCustomOrWorkflowFolder && (
        <>
          <AddChatsToFolderPopup
            folderName={aggregate.name}
            isVisible={isAddChatsPopupVisible}
            onHide={() => setIsAddChatsPopupVisible(false)}
          />
          <FolderFormPopup
            isEditing
            folder={aggregate.name}
            isVisible={isRenamePopupVisible}
            onHide={() => setIsRenamePopupVisible(false)}
          />
          <DeleteFolderPopup
            selectedFolder={aggregate.name}
            isVisible={isCustomDeletePopupVisible}
            onHide={() => setIsCustomDeletePopupVisible(false)}
          />
        </>
      )}
    </>
  )
}

export default FocusedAggregateRow
