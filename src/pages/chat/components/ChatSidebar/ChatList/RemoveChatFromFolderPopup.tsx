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

import Popup from '@/components/Popup'
import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { chatsStore } from '@/store/chats'
import { ChatListItem } from '@/types/entity/conversation'

interface RemoveChatFromFolderPopupProps {
  isVisible: boolean
  selectedChat?: ChatListItem
  onHide: () => void
  onRemove: () => void
}

const RemoveChatFromFolderPopup = ({
  isVisible,
  selectedChat,
  onHide,
  onRemove,
}: RemoveChatFromFolderPopupProps) => {
  const handleRemove = async () => {
    if (!selectedChat) return

    await chatsStore.moveChatToFolder(selectedChat.id, DEFAULT_CHAT_FOLDER, {
      successMessage: 'Chat removed from folder',
    })
    onHide()
    onRemove()
  }

  return (
    <Popup
      limitWidth
      visible={isVisible}
      header="Remove from folder?"
      onHide={onHide}
      onSubmit={handleRemove}
      submitText="Remove"
      withBorderBottom={false}
    >
      <p className="text-sm text-text-quaternary">
        This chat will be removed from{' '}
        <span className="inline-flex items-baseline">
          <span className="font-geist font-semibold text-text-primary">“</span>
          <strong className="text-text-primary">{selectedChat?.folder}</strong>
          <span className="font-geist font-semibold text-text-primary">”</span>
          <span>.</span>
        </span>
        <br />
        You will not lose this chat.
      </p>
    </Popup>
  )
}

export default RemoveChatFromFolderPopup
