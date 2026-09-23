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

import { useCallback, useState } from 'react'

import ArchiveSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
// import HistorySvg from '@/assets/icons/history.svg?react'
import Plus from '@/assets/icons/plus.svg?react'
import { NavigationItem } from '@/components/NavigationMore/NavigationMore'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'
import { ChatListItem } from '@/types/entity/conversation'

import {
  FolderKind,
  getAssistantIdFromFolderKey,
  getCustomFolderNameFromKey,
  getFolderDisplayName,
} from '../ChatSidebarLists/chatSidebarListsHelpers'

interface UseFolderListActionsParams {
  folderLabels?: Record<string, string>
  foldersToChatsMap?: Record<string, ChatListItem[]>
  onOpenAssistantHistory?: (assistantId: string) => void
}

export const useFolderListActions = ({
  folderLabels,
  foldersToChatsMap,
  onOpenAssistantHistory,
}: UseFolderListActionsParams) => {
  const router = useVueRouter()
  const [selectedFolder, setSelectedFolder] = useState<string>()
  const [addChatsFolder, setAddChatsFolder] = useState<string>()
  const [isDeleteFolderPopupVisible, setIsDeleteFolderPopupVisible] = useState(false)
  const [isFolderFormPopupVisible, setIsFolderFormPopupVisible] = useState(false)
  const [assistantFolderToDelete, setAssistantFolderToDelete] = useState<{
    id: string
    name: string
  }>()
  const getMenuItems = useCallback(
    (folder: string, kind: FolderKind): NavigationItem[] => {
      const displayName = folderLabels?.[folder] ?? getFolderDisplayName(folder)
      if (kind === 'import' || kind === 'legacy-import') return []

      if (kind === 'assistant') {
        const assistantId = getAssistantIdFromFolderKey(folder)
        if (!assistantId) return []
        return [
          {
            title: 'New chat',
            icon: <Plus />,
            onClick: (event) => {
              event.stopPropagation()
              chatsStore.startNewChat(assistantId, '', false).then(() => {
                router.push({ name: 'new-chat' })
              })
            },
          },
          // Temporarily hidden (EPMCDME-15210) — restore "View chat history" in the next release once its design is finalized.
          // {
          // title: 'View chat history',
          // icon: <HistorySvg />,
          // onClick: (event) => {
          // event.stopPropagation()
          // onOpenAssistantHistory?.(assistantId)
          // },
          // },
          {
            title: 'Edit assistant',
            icon: <EditSvg />,
            onClick: (event) => {
              event.stopPropagation()
              router.push({ name: 'edit-assistant', params: { id: assistantId } })
            },
          },
          {
            title: 'Delete...',
            icon: <ArchiveSvg />,
            onClick: (event) => {
              event.stopPropagation()
              setAssistantFolderToDelete({ id: assistantId, name: displayName })
            },
          },
        ]
      }

      const customFolderName = getCustomFolderNameFromKey(folder) ?? folder
      // A workflow-associated folder (EPMCDME-15012) is a run history, not a user-curated
      // collection — "Add chats..." (which lets you file existing chats into it) doesn't apply.
      // The old main behavior for a workflow was to start a new chat with it directly; keep that
      // instead, and derive the workflow id from any chat already in the folder (they all share
      // one, per isWorkflowAssociatedFolder's invariant).
      const workflowId =
        kind === 'workflow' ? foldersToChatsMap?.[folder]?.[0]?.initialWorkflowId ?? null : null
      const firstMenuItem: NavigationItem =
        kind === 'workflow' && workflowId
          ? {
              title: 'New chat',
              icon: <Plus />,
              onClick: (event) => {
                event.stopPropagation()
                chatsStore.startNewChat(workflowId, displayName, true).then(() => {
                  router.push({ name: 'new-chat' })
                })
              },
            }
          : {
              title: 'Add chats...',
              icon: <Plus />,
              onClick: (event) => {
                event.stopPropagation()
                setAddChatsFolder(customFolderName)
              },
            }
      return [
        firstMenuItem,
        {
          title: 'Rename folder',
          icon: <EditSvg />,
          onClick: (event) => {
            event.stopPropagation()
            setSelectedFolder(customFolderName)
            setIsFolderFormPopupVisible(true)
          },
        },
        {
          title: 'Delete...',
          icon: <ArchiveSvg />,
          onClick: (event) => {
            event.stopPropagation()
            setSelectedFolder(customFolderName)
            setIsDeleteFolderPopupVisible(true)
          },
        },
      ]
    },
    [folderLabels, foldersToChatsMap, onOpenAssistantHistory, router]
  )

  return {
    selectedFolder,
    addChatsFolder,
    isDeleteFolderPopupVisible,
    isFolderFormPopupVisible,
    assistantFolderToDelete,
    getMenuItems,
    closeDeleteFolderPopup: () => setIsDeleteFolderPopupVisible(false),
    closeFolderFormPopup: () => setIsFolderFormPopupVisible(false),
    closeAddChatsPopup: () => setAddChatsFolder(undefined),
    closeAssistantFolderDeletePopup: () => setAssistantFolderToDelete(undefined),
  }
}
