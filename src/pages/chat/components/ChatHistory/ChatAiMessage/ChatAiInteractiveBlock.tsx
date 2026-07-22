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

import { FC } from 'react'
import { useSnapshot } from 'valtio'

import InteractiveErrorBoundary from '@/components/InteractiveElements/InteractiveErrorBoundary'
import InteractiveSurface from '@/components/InteractiveElements/InteractiveSurface'
import { chatGenerationStore } from '@/store/chatGeneration'
import { chatsStore } from '@/store/chats'
import type { ChatMessage } from '@/types/entity/conversation'

import { ChatIndexes } from '../ChatHistory'

interface ChatAiInteractiveBlockProps {
  message: ChatMessage
  indexes: ChatIndexes
  // "Editing" a widget message means unlocking the (otherwise read-only, already
  // answered) form so it can be re-answered.
  isFormEditing: boolean
  onSubmitted: () => void
}

const ChatAiInteractiveBlock: FC<ChatAiInteractiveBlockProps> = ({
  message,
  indexes,
  isFormEditing,
  onSubmitted,
}) => {
  const { currentChat } = useSnapshot(chatsStore)
  const { interactiveRequest } = message

  if (!interactiveRequest) {
    return null
  }

  const history = currentChat?.history ?? []
  const flatHistory = history.flat()
  const lastGroupIndex = history.length - 1
  // The answer to this request lives on a LATER turn (the user chip). Find the most
  // recent turn carrying it, so a re-answer (which replaces that turn) resolves to
  // the latest response.
  const answerTurnIndex = history.reduce(
    (found, group, groupIndex) =>
      group.some((item) => item.interactiveResponse?.request_id === interactiveRequest.request_id)
        ? groupIndex
        : found,
    -1
  )
  const submittedInteractiveResponse =
    answerTurnIndex >= 0
      ? [...history[answerTurnIndex]]
          .reverse()
          .find((item) => item.interactiveResponse?.request_id === interactiveRequest.request_id)
          ?.interactiveResponse ?? null
      : null
  const isChatBusy = flatHistory.some((item) => item.inProgress)
  // The block is interactive when nothing is generating AND either:
  //  - it is still unanswered and sits at the live edge (last turn); or
  //  - it was answered and the user explicitly unlocked it via "Edit" — re-answering
  //    then replaces its turn, exactly like editing a previous request. An answered
  //    form is otherwise read-only, so the version/variant switch only ever appears
  //    as the deliberate result of a re-answer, never spontaneously.
  const isUnansweredAtEdge =
    !submittedInteractiveResponse && indexes.historyIndex === lastGroupIndex
  const isInteractiveBlockActive = !isChatBusy && (isFormEditing || isUnansweredAtEdge)

  return (
    <InteractiveErrorBoundary>
      <InteractiveSurface
        request={interactiveRequest}
        disabled={!isInteractiveBlockActive}
        submittedResponse={submittedInteractiveResponse}
        onSubmit={(kind, payload, displayText) => {
          onSubmitted()
          chatGenerationStore.submitInteractiveResponse(
            { request_id: interactiveRequest.request_id, kind, payload },
            displayText,
            submittedInteractiveResponse ? answerTurnIndex : undefined
          )
        }}
      />
    </InteractiveErrorBoundary>
  )
}

export default ChatAiInteractiveBlock
