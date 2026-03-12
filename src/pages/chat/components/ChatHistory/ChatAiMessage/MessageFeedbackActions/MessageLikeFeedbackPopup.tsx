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

import { ChangeEvent, FC } from 'react'

import Textarea from '@/components/form/Textarea'
import Popup from '@/components/Popup'

export interface MessageLikeFeedback {
  comment: string
}

interface MessageLikeFeedbackPopupProps {
  isVisible: boolean
  feedback: MessageLikeFeedback
  onFeedbackChange: (feedback: MessageLikeFeedback) => void
  onHide: () => void
  onSubmit: () => void
}

const MessageLikeFeedbackPopup: FC<MessageLikeFeedbackPopupProps> = ({
  isVisible,
  feedback,
  onFeedbackChange,
  onHide,
  onSubmit,
}) => {
  const handleCommentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onFeedbackChange({ comment: e.target.value })
  }

  return (
    <Popup
      limitWidth
      header="Submit Positive Feedback"
      submitText="Send"
      withBorder={false}
      visible={isVisible}
      onHide={onHide}
      onSubmit={onSubmit}
    >
      <div className="flex flex-col">
        <p className="text-text-secondary mb-4 mt-1">
          Thank you for your positive feedback! Optionally, you can provide additional context such
          as related ticket references.
        </p>

        <Textarea
          rows={4}
          value={feedback.comment}
          onChange={handleCommentChange}
          placeholder="Optional: Add reference or note (Jira, ServiceNow, etc.)..."
        />
      </div>
    </Popup>
  )
}

export default MessageLikeFeedbackPopup
