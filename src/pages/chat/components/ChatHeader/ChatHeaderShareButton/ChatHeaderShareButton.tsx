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

import ShareSvg from '@/assets/icons/share.svg?react'
import Button from '@/components/Button'
import { chatsStore } from '@/store/chats'

import ShareChatPopup from './ShareChatPopup'

const ChatHeaderShareButton: FC = () => {
  const { currentChat, shareChat } = useSnapshot(chatsStore)

  const [isLoading, setIsLoading] = useState(false)
  const [isPopupVisible, setIsPopupVisible] = useState(false)
  const [shareLink, setShareLink] = useState<string>()

  const onShareChat = async () => {
    setIsLoading(true)
    try {
      const link = await shareChat(currentChat?.id)
      if (link) {
        setShareLink(link)
        setIsPopupVisible(true)
      }
    } catch (error) {
      console.error('Failed to share chat:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        data-tooltip-id="react-tooltip"
        data-tooltip-content="Share Chat"
        aria-label="Share Chat"
        className="text-xs target-tooltip"
        disabled={isLoading}
        onClick={onShareChat}
      >
        <ShareSvg />
      </Button>

      <ShareChatPopup
        shareLink={shareLink}
        isVisible={isPopupVisible}
        onHide={() => {
          setIsPopupVisible(false)
        }}
      />
    </>
  )
}

export default ChatHeaderShareButton
