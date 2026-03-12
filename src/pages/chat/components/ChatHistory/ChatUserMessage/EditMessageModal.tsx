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

import { FC, useEffect, useRef, useState } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import Button from '@/components/Button'
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { copyToClipboard } from '@/utils/utils'

interface EditMessageModalProps {
  visible: boolean
  message: string
  onClose: () => void
  onSave: (newMessage: string) => void
}

const EditMessageModal: FC<EditMessageModalProps> = ({ visible, message, onClose, onSave }) => {
  const [editedMessage, setEditedMessage] = useState(message)
  const textareaRef = useRef<TextareaRef>(null)

  useEffect(() => {
    setEditedMessage(message)
  }, [message, visible])

  useEffect(() => {
    if (visible && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setCursor(editedMessage.length)
    }
  }, [visible])

  const handleSave = () => {
    if (editedMessage.trim()) {
      onSave(editedMessage)
    }
  }

  const handleCopy = () => {
    copyToClipboard(editedMessage, 'Message copied to clipboard')
  }

  return (
    <Popup
      hideFooter
      isFullWidth
      visible={visible}
      onHide={onClose}
      className="h-[90vh] pb-6"
      headerContent={
        <div className="flex items-center justify-between w-full">
          <h4>Edit Message</h4>
        </div>
      }
    >
      <div className="flex flex-col h-full pt-4 gap-4">
        <div className="flex flex-col bg-surface-base-secondary border border-border-primary dark:border-border-specific-panel-outline rounded-lg overflow-hidden h-full">
          <div className="flex justify-between items-center px-4 py-2 bg-border-primary/10 dark:bg-border-primary border-b border-border-primary dark:border-border-specific-panel-outline">
            <p className="text-xs">Message Content</p>
            <Button type="secondary" onClick={handleCopy}>
              <CopySvg />
              Copy
            </Button>
          </div>
          <Textarea
            ref={textareaRef}
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            rootClass="h-full"
            className="resize-none min-h-full rounded-none border-0"
            placeholder="Type your message here"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!editedMessage.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Popup>
  )
}

export default EditMessageModal
