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

import ArchiveSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import FolderSvg from '@/assets/icons/folder-move.svg?react'
import PinSvg from '@/assets/icons/pin.svg?react'
import NavigationMore, { type NavigationItem } from '@/components/NavigationMore/NavigationMore'
import { type ChatListItem } from '@/types/entity/conversation'

export interface ChatListItemContextMenuProps {
  chat: ChatListItem
  isImportChat: boolean
  pinChat: (id: string) => void
  moveChat: (chat: ChatListItem) => void
  removeChatFromFolder?: (chat: ChatListItem) => void
  deleteChat: (chat: ChatListItem) => void
  edit: () => void
  contextId: string
  onOpenChange: (open: boolean) => void
}

const buildMenuItems = ({
  chat,
  isImportChat,
  pinChat,
  moveChat,
  removeChatFromFolder,
  deleteChat,
  edit,
}: Omit<ChatListItemContextMenuProps, 'contextId' | 'onOpenChange'>): NavigationItem[] => {
  const items: NavigationItem[] = [
    {
      title: chat.pinned ? 'Unpin' : 'Pin',
      onClick: () => pinChat(chat.id),
      icon: <PinSvg className="icon" />,
    },
  ]
  if (!isImportChat) {
    items.push({
      title: chat.folder ? 'Move to folder...' : 'Add to folder...',
      onClick: () => moveChat(chat),
      icon: <FolderSvg className="icon" />,
    })
    if (chat.folder) {
      items.push({
        title: 'Remove from folder',
        onClick: (event) => {
          event.stopPropagation()
          removeChatFromFolder?.(chat)
        },
        icon: <FolderSvg className="icon" />,
      })
    }
  }
  items.push(
    { title: 'Rename', onClick: edit, icon: <EditSvg className="icon" /> },
    { title: 'Delete', onClick: () => deleteChat(chat), icon: <ArchiveSvg className="icon" /> }
  )
  return items
}

const ChatListItemContextMenu: FC<ChatListItemContextMenuProps> = ({
  chat,
  isImportChat,
  pinChat,
  moveChat,
  removeChatFromFolder,
  deleteChat,
  edit,
  contextId,
  onOpenChange,
}) => (
  <NavigationMore
    renderInRoot
    placement="right-end"
    hideOnClickInside
    className="size-6 shrink-0"
    buttonClassName="m-0 flex size-6 items-center justify-center p-0"
    contextId={contextId}
    onOpenChange={onOpenChange}
    items={buildMenuItems({
      chat,
      isImportChat,
      pinChat,
      moveChat,
      removeChatFromFolder,
      deleteChat,
      edit,
    })}
  />
)

export default ChatListItemContextMenu
