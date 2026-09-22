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

import { Accordion, AccordionTab } from 'primereact/accordion'
import { FC } from 'react'

import AvatarGroup from '@/components/Avatar/AvatarGroup'
import NavigationMore from '@/components/NavigationMore/NavigationMore'
import Tooltip from '@/components/Tooltip'
import {
  resolveChatAvatar,
  resolveGroupChatAvatars,
  useAvatarStores,
  type AvatarStores,
  type ResolvedChatAvatar,
} from '@/pages/chat/hooks/useChatItemAvatar'
import { ChatListDensity } from '@/store/chatViewSettings'
import { ChatListItem as ChatListItemType } from '@/types/entity/conversation'
import { cn } from '@/utils/utils'

import DeleteFolderPopup from './DeleteFolderPopup'
import FolderFormPopup from './FolderFormPopup'
import { useFolderListActions } from './useFolderListActions'
import AddChatsToFolderPopup from '../AddChatsToFolderPopup'
import AssistantFolderDeletePopup from './AssistantFolderDeletePopup'
import ChatList from '../ChatList/ChatList'
import { ChatListItemActions, RegisterChatElement } from '../ChatList/ChatListItem'
import {
  FolderKind,
  getFolderDisplayName,
  getFolderKindFromKey,
} from '../ChatSidebarLists/chatSidebarListsHelpers'
import FolderTypeIcon from '../FolderTypeIcon'

const FOLDER_TOOLTIP_MIN_LENGTH = 23

const resolveFolderUniqueAvatars = (
  folderChats: ChatListItemType[],
  avatarStores: AvatarStores
): ResolvedChatAvatar[] => {
  const seen = new Set<string>()
  const items: ResolvedChatAvatar[] = []
  for (const chat of folderChats) {
    if (chat.isGroup && chat.assistantIds.length > 0) {
      const avatars = resolveGroupChatAvatars(chat, avatarStores)
      chat.assistantIds.forEach((id, i) => {
        if (id && !seen.has(id)) {
          seen.add(id)
          items.push(avatars[i] ?? { iconUrl: null, name: chat.assistantNames?.[i] })
        }
      })
    } else {
      const key =
        chat.initialAssistantId ?? `${chat.iconUrl ?? ''}:${chat.assistantNames?.[0] ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        items.push(resolveChatAvatar(chat, avatarStores))
      }
    }
  }
  return items
}

interface FolderListProps {
  folders: string[]
  activeFolderIndices?: number[]
  /** @deprecated Single-folder mode is retained only for existing callers during migration. */
  activeFolderIndex?: number | null
  chatActions: ChatListItemActions
  currentChatId?: string
  foldersToChatsMap: Record<string, ChatListItemType[]>
  folderLabels?: Record<string, string>
  folderKinds?: Record<string, FolderKind>
  setActiveFolders?: (folders: string[]) => void
  /** @deprecated Use setActiveFolders for multi-expand behavior. */
  setActiveFolder?: (folder: string | null) => void
  onOpenAssistantHistory?: (assistantId: string) => void
  density?: ChatListDensity
  registerChatElement?: RegisterChatElement
  registerFolderElement?: (folderName: string, element: HTMLDivElement | null) => void
}

const FolderList: FC<FolderListProps> = ({
  folders,
  chatActions,
  activeFolderIndices,
  activeFolderIndex,
  currentChatId,
  foldersToChatsMap,
  folderLabels,
  folderKinds,
  setActiveFolders,
  setActiveFolder,
  onOpenAssistantHistory,
  density = ChatListDensity.DETAILED,
  registerChatElement,
  registerFolderElement,
}) => {
  const avatarStores = useAvatarStores()
  const isCompact = density === ChatListDensity.COMPACT
  const {
    selectedFolder,
    addChatsFolder,
    isDeleteFolderPopupVisible,
    isFolderFormPopupVisible,
    assistantFolderToDelete,
    getMenuItems,
    closeDeleteFolderPopup,
    closeFolderFormPopup,
    closeAddChatsPopup,
    closeAssistantFolderDeletePopup,
  } = useFolderListActions({ folderLabels, foldersToChatsMap, onOpenAssistantHistory })

  const setActiveFolderIndices = (indices: number[]) => {
    const expandedFolders = indices.map((index) => folders[index]).filter(Boolean)
    if (setActiveFolders) setActiveFolders(expandedFolders)
    else setActiveFolder?.(expandedFolders[expandedFolders.length - 1] ?? null)
  }

  const resolvedActiveFolderIndices =
    activeFolderIndices ?? (activeFolderIndex == null ? [] : [activeFolderIndex])

  return (
    <div>
      <Tooltip target=".chat-sidebar-folder" appendTo={null} delay={0} />
      <Accordion
        multiple
        activeIndex={resolvedActiveFolderIndices}
        onTabChange={(e) => setActiveFolderIndices(e.index as number[])}
        expandIcon={() => null}
        collapseIcon={() => null}
      >
        {folders.map((folder) => {
          const kind = folderKinds?.[folder] ?? getFolderKindFromKey(folder)
          const isImportFolder = kind === 'import' || kind === 'legacy-import'
          const folderKey = encodeURIComponent(folder)
          const legacyKey = `legacy-import:${folder}`
          let chatMapKey = folder
          if (kind === 'legacy-import' && legacyKey in foldersToChatsMap) {
            chatMapKey = legacyKey
          }
          const displayName = folderLabels?.[folder] ?? getFolderDisplayName(folder)
          const showFolderTooltip = displayName.length >= FOLDER_TOOLTIP_MIN_LENGTH
          const folderChats = foldersToChatsMap[chatMapKey] ?? []

          const uniqueAvatarItems = resolveFolderUniqueAvatars(folderChats, avatarStores)

          return (
            <AccordionTab
              key={folder}
              pt={{
                headerAction: (opts) => ({
                  href: null,
                  tabIndex: 0,
                  'aria-label': folder,
                  'data-folder': folder,
                  'data-folder-open': opts?.context.selected,
                  role: 'treeitem',
                  'aria-expanded': opts?.context.selected ?? false,
                  'aria-owns': `chat-tree-folder-group-${folderKey}`,
                }),
              }}
              header={() => (
                <div
                  ref={(element) => registerFolderElement?.(folder, element)}
                  className="flex min-w-0 items-center justify-between gap-2 px-2 text-sm"
                >
                  <div
                    className={cn(
                      'flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap',
                      isCompact ? 'h-8' : 'h-10'
                    )}
                  >
                    <FolderTypeIcon kind={kind} className="mr-2" />
                    <p
                      id={`folder-name-${folderKey}`}
                      data-pr-tooltip={showFolderTooltip ? displayName : ''}
                      className="chat-sidebar-folder min-w-0 flex-1 truncate font-semibold"
                    >
                      {displayName}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center">
                    {!isCompact &&
                      !isImportFolder &&
                      uniqueAvatarItems.length > (kind === 'assistant' ? 1 : 0) && (
                        <AvatarGroup
                          iconUrls={uniqueAvatarItems.map((avatar) => avatar.iconUrl)}
                          names={uniqueAvatarItems.map((avatar) => avatar.name)}
                          className="mr-1 shrink-0"
                        />
                      )}
                    {getMenuItems(folder, kind).length > 0 && (
                      <NavigationMore
                        renderInRoot
                        placement="right-end"
                        hideOnClickInside
                        className="size-6 shrink-0"
                        buttonClassName="m-0 flex size-6 items-center justify-center p-0"
                        contextId={`folder-name-${folderKey}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                        }}
                        items={getMenuItems(folder, kind)}
                      />
                    )}
                  </div>
                </div>
              )}
            >
              <div className="ml-4 flex min-w-0 flex-col border-l border-border-secondary pl-4">
                <ChatList
                  chats={folderChats}
                  chatActions={chatActions}
                  currentChatId={currentChatId}
                  hideAvatar={
                    kind === 'assistant'
                      ? (chat) => !chat.isGroup || new Set(chat.assistantIds).size <= 1
                      : false
                  }
                  density={density}
                  registerChatElement={registerChatElement}
                  id={`chat-tree-folder-group-${folderKey}`}
                />
              </div>
            </AccordionTab>
          )
        })}
      </Accordion>

      <DeleteFolderPopup
        selectedFolder={selectedFolder}
        isVisible={isDeleteFolderPopupVisible}
        onHide={closeDeleteFolderPopup}
      />

      <AssistantFolderDeletePopup
        assistantId={assistantFolderToDelete?.id}
        assistantName={assistantFolderToDelete?.name}
        isVisible={assistantFolderToDelete !== undefined}
        onHide={closeAssistantFolderDeletePopup}
      />

      <AddChatsToFolderPopup
        folderName={addChatsFolder}
        isVisible={addChatsFolder !== undefined}
        onHide={closeAddChatsPopup}
      />

      <FolderFormPopup
        isEditing
        folder={selectedFolder}
        isVisible={isFolderFormPopupVisible}
        onHide={closeFolderFormPopup}
      />
    </div>
  )
}

export default FolderList
