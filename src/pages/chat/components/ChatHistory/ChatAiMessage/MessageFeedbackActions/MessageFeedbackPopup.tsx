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
import { cn } from '@/utils/utils'

const feedbackTypes = [
  'Missed or Misunderstood Context',
  'Factual Inaccuracy (Hallucination)',
  'Incomplete or Partial Answer',
  'Context and Memory Limitations',
  'Configuration/Connection Issues',
  'Other',
]

export interface MessageFeedback {
  type: string
  comment: string
}

interface MessageFeedbackPopupProps {
  isVisible: boolean
  feedback: MessageFeedback
  onFeedbackChange: (feedback: MessageFeedback) => void
  onHide: () => void
  onSubmit: () => void
}

const MessageFeedbackPopup: FC<MessageFeedbackPopupProps> = ({
  isVisible,
  feedback,
  onFeedbackChange,
  onHide,
  onSubmit,
}) => {
  const handleCommentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onFeedbackChange({ comment: e.target.value, type: feedback.type || 'Other' })
  }

  return (
    <Popup
      limitWidth
      header="Submit Feedback About This Assistant"
      submitText="Send"
      withBorder={false}
      visible={isVisible}
      submitDisabled={!feedback.type && !feedback.comment}
      onHide={onHide}
      onSubmit={onSubmit}
    >
      <div className="flex flex-col">
        <p className="text-text-quaternary mb-4 mt-1">What would you like to report?</p>

        <div className="flex flex-row flex-wrap gap-2">
          {feedbackTypes.map((feedbackType) => (
            <button
              key={feedbackType}
              onClick={() => onFeedbackChange({ ...feedback, type: feedbackType })}
              className={cn(
                'rounded-lg border border-border-primary transition hover:border-border-tertiary text-xs py-1 px-2 whitespace-nowrap overflow-hidden text-ellipsis',
                feedback.type === feedbackType && 'border-border-tertiary'
              )}
            >
              {feedbackType}
            </button>
          ))}
        </div>

        <Textarea
          rows={4}
          value={feedback.comment}
          className="mt-6"
          onChange={handleCommentChange}
          placeholder="Add specific examples or details about the issue"
        />
      </div>
    </Popup>
  )
}

export default MessageFeedbackPopup
