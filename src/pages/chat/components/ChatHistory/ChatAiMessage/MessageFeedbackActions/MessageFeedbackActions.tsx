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

import { FC, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import ThumbDownSvg from '@/assets/icons/thumb-down.svg?react'
import ThumbUpSvg from '@/assets/icons/thumb-up.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { CONFIG_LIKE_FORM_KEY } from '@/constants/common'
import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'
import { ChatMessage, MessageFeedbackMark, messageFeedbackMark } from '@/types/entity/conversation'
import { isConfigItemEnabled } from '@/utils/settings'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import MessageFeedbackPopup, { MessageFeedback } from './MessageFeedbackPopup'
import MessageLikeFeedbackPopup, { MessageLikeFeedback } from './MessageLikeFeedbackPopup'
import { ChatIndexes } from '../../ChatHistory'
import ChatMessageAction from '../../ChatMessageAction'

interface MessageFeedbackActionsProps {
  message: ChatMessage
  indexes: ChatIndexes
}

const MessageFeedbackActions: FC<MessageFeedbackActionsProps> = ({ message, indexes }) => {
  const { currentChat } = useSnapshot(chatsStore)
  const { configs } = useSnapshot(appInfoStore)
  const [isFeedbackPopupVisible, setIsFeedbackPopupVisible] = useState(false)
  const [isLikeFeedbackPopupVisible, setIsLikeFeedbackPopupVisible] = useState(false)
  const [isDeleteFeedbackPopupVisible, setIsDeleteFeedbackPopupVisible] = useState(false)
  const [mark, setMark] = useState<MessageFeedbackMark>(
    message.userMark?.mark ?? messageFeedbackMark.empty
  )
  const [feedback, setFeedback] = useState<MessageFeedback>({ type: '', comment: '' })
  const [likeFeedback, setLikeFeedback] = useState<MessageLikeFeedback>({ comment: '' })

  useEffect(() => {
    setMark(message.userMark?.mark ?? messageFeedbackMark.empty)
  }, [message.userMark?.mark])

  const isLiked = mark === messageFeedbackMark.correct
  const isDisliked = mark === messageFeedbackMark.wrong

  const deleteFeedback = () => {
    if (!currentChat || !message.userMark?.feedback_id) return

    const oldMark = mark
    setMark(messageFeedbackMark.empty)

    try {
      setIsDeleteFeedbackPopupVisible(false)
      chatsStore.deleteFeedback(
        currentChat.id,
        message.assistantId!,
        message.userMark.feedback_id,
        indexes.historyIndex,
        indexes.messageIndex
      )
      toaster.info('Feedback deleted successfully')
    } catch (error) {
      console.error('Error submitting feedback: ', error)
      setMark(oldMark)
    }
  }

  const submitFeedback = async (newMark: MessageFeedbackMark) => {
    if (!currentChat) return

    const oldMark = mark
    setMark(newMark)

    try {
      await chatsStore.submitFeedback(
        currentChat.id,
        {
          mark: newMark,
          comments: feedback.comment,
          type: feedback.type,
          request: message.request,
          response: message.response,
          assistant_id: message.assistantId,
        },
        indexes.historyIndex,
        indexes.messageIndex
      )
      toaster.info('Thank you for your feedback')
      if (isFeedbackPopupVisible) setIsFeedbackPopupVisible(false)
    } catch (error) {
      console.error('Error submitting feedback: ', error)
      setMark(oldMark)
    }
  }

  const handleLike = () => {
    if (isLiked) {
      setIsDeleteFeedbackPopupVisible(true)
    } else {
      const isLikeFormEnabled = isConfigItemEnabled(configs, CONFIG_LIKE_FORM_KEY)

      if (isLikeFormEnabled) {
        setLikeFeedback({ comment: '' })
        setIsLikeFeedbackPopupVisible(true)
      } else {
        // Directly submit feedback with empty comment
        setLikeFeedback({ comment: '' })
        submitLikeFeedback()
      }
    }
  }

  const submitLikeFeedback = async () => {
    if (!currentChat) return

    const oldMark = mark
    setMark(messageFeedbackMark.correct)

    try {
      await chatsStore.submitFeedback(
        currentChat.id,
        {
          mark: messageFeedbackMark.correct,
          comments: likeFeedback.comment,
          type: '',
          request: message.request,
          response: message.response,
          assistant_id: message.assistantId,
        },
        indexes.historyIndex,
        indexes.messageIndex
      )
      toaster.info('Thank you for your feedback')
      if (isLikeFeedbackPopupVisible) setIsLikeFeedbackPopupVisible(false)
    } catch (error) {
      console.error('Error submitting feedback: ', error)
      setMark(oldMark)
    }
  }

  const handleDislike = () => {
    if (isDisliked) setIsDeleteFeedbackPopupVisible(true)
    else {
      setFeedback({ ...feedback, comment: '', type: '' })
      setIsFeedbackPopupVisible(true)
    }
  }

  return (
    <>
      <ChatMessageAction
        icon={ThumbUpSvg}
        onClick={handleLike}
        iconClassName={cn('h-4', isLiked && 'text-text-accent')}
        label={isLiked ? 'Click to remove your positive feedback' : 'Like this response'}
      />

      <ChatMessageAction
        icon={ThumbDownSvg}
        onClick={handleDislike}
        iconClassName={cn('h-4', isDisliked && 'text-failed-secondary')}
        label={isDisliked ? 'Click to remove yout negative feedback' : 'Dislike this response'}
      />

      <ConfirmationModal
        limitWidth
        header="Delete Feedback"
        message="Are you sure you want to delete your feedback for this message? This action cannot be
        undone."
        confirmText="Delete Feedback"
        visible={isDeleteFeedbackPopupVisible}
        onConfirm={deleteFeedback}
        onCancel={() => setIsDeleteFeedbackPopupVisible(false)}
        confirmButtonType={ButtonType.DELETE}
      />

      <MessageFeedbackPopup
        isVisible={isFeedbackPopupVisible}
        feedback={feedback}
        onFeedbackChange={setFeedback}
        onHide={() => setIsFeedbackPopupVisible(false)}
        onSubmit={() => submitFeedback(messageFeedbackMark.wrong)}
      />

      <MessageLikeFeedbackPopup
        isVisible={isLikeFeedbackPopupVisible}
        feedback={likeFeedback}
        onFeedbackChange={setLikeFeedback}
        onHide={() => setIsLikeFeedbackPopupVisible(false)}
        onSubmit={submitLikeFeedback}
      />
    </>
  )
}

export default MessageFeedbackActions
