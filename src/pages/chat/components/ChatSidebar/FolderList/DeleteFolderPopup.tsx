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

import { useSnapshot } from 'valtio'

import DeleteSvg from '@/assets/icons/delete.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'

interface DeleteFolderPopupProps {
  selectedFolder?: string
  isVisible: boolean
  onHide: () => void
}

const DeleteFolderPopup = ({ selectedFolder, isVisible, onHide }: DeleteFolderPopupProps) => {
  const router = useVueRouter()
  const { currentChat } = useSnapshot(chatsStore)

  const deleteFolder = async () => {
    const isActiveChatInFolder = currentChat && currentChat.folder === selectedFolder
    await chatsStore.deleteChatFolder(selectedFolder ?? '', true)

    if (isActiveChatInFolder) {
      const nextChat = chatsStore.chats[0]
      if (nextChat) router.push({ name: 'chats', params: { id: nextChat.id } })
      else router.push({ name: 'new-chat' })
    }

    onHide()
  }

  return (
    <Popup
      limitWidth
      visible={isVisible}
      hideClose
      header="Delete this folder?"
      withBorder={false}
      onHide={onHide}
      footerContent={
        <div className="flex justify-end pb-3 gap-3 grow">
          <Button variant={ButtonType.BASE} onClick={onHide}>
            Cancel
          </Button>
          <Button variant={ButtonType.DELETE} onClick={deleteFolder}>
            <DeleteSvg /> Delete folder and chats
          </Button>
        </div>
      }
    >
      <p className="mb-3">
        This permanently deletes the folder and every chat currently inside it. Deleted chats will
        also disappear from Recent Chats, Pinned, Search, and Assistant History.
      </p>
    </Popup>
  )
}

export default DeleteFolderPopup
