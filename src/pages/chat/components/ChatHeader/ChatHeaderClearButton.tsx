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
import { useSnapshot } from 'valtio'

import ClearSvg from '@/assets/icons/clear.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { chatsStore } from '@/store/chats'

const ChatHeaderClearButton: FC = () => {
  const { currentChat, clearChatHistory } = useSnapshot(chatsStore)
  const [isPopupVisible, setIsPopupVisible] = useState(false)

  const handleConfirm = () => {
    clearChatHistory(currentChat?.id)
    setIsPopupVisible(false)
  }

  return (
    <>
      <Button
        type="secondary"
        className="target-tooltip"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Clear Chat"
        aria-label="Clear Chat"
        onClick={() => setIsPopupVisible(true)}
      >
        <ClearSvg aria-hidden="true" />
      </Button>

      <ConfirmationModal
        limitWidth
        visible={isPopupVisible}
        header="Clear conversation"
        message="Are you sure you want to clear this conversation? This action cannot be undone."
        confirmText="Clear"
        onCancel={() => setIsPopupVisible(false)}
        onConfirm={handleConfirm}
        confirmButtonType={ButtonType.DELETE}
      />
    </>
  )
}

export default ChatHeaderClearButton
