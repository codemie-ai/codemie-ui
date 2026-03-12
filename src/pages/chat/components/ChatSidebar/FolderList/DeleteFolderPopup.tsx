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
import { useVueRouter } from '@/hooks/useVueRouter'
import { chatsStore } from '@/store/chats'

interface DeleteFolderPopupProps {
  selectedFolder?: string
  isVisible: boolean
  onHide: () => void
}

const DeleteFolderPopup = ({ selectedFolder, isVisible, onHide }: DeleteFolderPopupProps) => {
  const router = useVueRouter()
  const { chats, currentChat } = useSnapshot(chatsStore)

  const deleteFolder = async (deleteWithChats = false) => {
    const isActiveChatInFolder = currentChat && currentChat.folder === selectedFolder
    await chatsStore.deleteChatFolder(selectedFolder ?? '', deleteWithChats)

    if (isActiveChatInFolder && chats.length > 0) {
      router.push({ name: 'chats', params: { id: chats[0].id } })
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
        <div className="flex justify-between pb-3 gap-3 grow">
          <Button onClick={onHide}>Cancel</Button>

          <div className="flex gap-3">
            <Button onClick={() => deleteFolder()}>Delete Folder</Button>
            <Button variant="delete" onClick={() => deleteFolder(true)}>
              <DeleteSvg /> Delete with Chats
            </Button>
          </div>
        </div>
      }
    >
      <p className="mb-3">
        To delete folder with all chats that are contained within it - press{' '}
        <b>&quot;Delete with Chats&quot;</b>
      </p>
      <p className="mb-3">
        To delete this folder only - press the button <b>&quot;Delete Folder&quot;</b> below.
      </p>
    </Popup>
  )
}

export default DeleteFolderPopup
