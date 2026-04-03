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

import CloseSvg from '@/assets/icons/cross.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import PlaySvg from '@/assets/icons/play.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import toaster from '@/utils/toaster'

import ChatEditOutputForm from './ChatEditOutputForm'

interface ChatControlsProps {
  chatId: string
}

const ChatControls: FC<ChatControlsProps> = ({ chatId }) => {
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const [inProgress, setInProgress] = useState(false)
  const [isPopupVisible, setPopupVisible] = useState(false)

  const handleAbort = async () => {
    await chatGenerationStore.abortWorkflowChat(chatId)
    toaster.info('Chat execution aborted')
  }

  const handleResume = async () => {
    if (!currentChat) return

    setInProgress(true)
    await chatGenerationStore.resumeWorkflowExecution()
    setInProgress(false)
  }

  const closeEditOutputPopup = () => setPopupVisible(false)

  const handleUpdate = () => {
    chatsStore.getChat(chatId)
    closeEditOutputPopup()
  }

  if (inProgress) {
    return <></>
  }

  return (
    <>
      <div className="flex gap-2 mb-6 absolute left-1/2 -translate-x-1/2 -translate-y-12">
        <div className="bg-surface-base-primary rounded-lg">
          <Button variant={ButtonType.DELETE} onClick={handleAbort}>
            <CloseSvg /> Cancel
          </Button>
        </div>

        <Button
          variant={ButtonType.SECONDARY}
          onClick={() => {
            setPopupVisible(true)
          }}
        >
          <EditSvg /> Edit
        </Button>

        <Button variant={ButtonType.PRIMARY} onClick={handleResume}>
          <PlaySvg /> Continue
        </Button>
      </div>

      <Popup
        hideFooter
        header="Edit Output"
        className="w-full max-w-2xl"
        bodyClassName="pb-4"
        visible={isPopupVisible}
        onHide={closeEditOutputPopup}
      >
        <ChatEditOutputForm
          chatId={chatId}
          onUpdate={handleUpdate}
          onCancel={closeEditOutputPopup}
        />
      </Popup>
    </>
  )
}

export default ChatControls
