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

import ExportSvg from '@/assets/icons/download.svg?react'
import Button from '@/components/Button'

import ExportConversationPopup from './ExportConversationPopup'

const ChatHeaderDownloadConversationButton: FC = () => {
  const [isVisible, setIsVisible] = useState(false)

  const handleOpen = () => setIsVisible(true)
  const handleClose = () => setIsVisible(false)

  return (
    <>
      <div data-onboarding="chat-export-button">
        <Button
          type="secondary"
          aria-label="Export Conversation"
          aria-haspopup="dialog"
          aria-expanded={isVisible}
          data-tooltip-id="react-tooltip"
          data-tooltip-content={isVisible ? '' : 'Export Conversation'}
          onClick={handleOpen}
        >
          <ExportSvg aria-hidden="true" />
        </Button>
      </div>
      <ExportConversationPopup isVisible={isVisible} onHide={handleClose} />
    </>
  )
}

export default ChatHeaderDownloadConversationButton
