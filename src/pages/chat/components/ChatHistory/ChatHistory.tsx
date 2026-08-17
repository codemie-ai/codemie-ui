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

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'

import ChatHistoryGroup from './ChatHistoryGroup'
import ChatPremiumModelTip from '../ChatPrompt/ChatPremiumModelTip'
import { useChatInfiniteScroll } from './hooks/useChatInfiniteScroll'
import { useChatScroll } from './hooks/useChatScroll'

export interface ChatIndexes {
  historyIndex: number
  messageIndex: number
}

const ChatHistory = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { refs, visibleHistory, hasMoreMessages, lastMessageIndex } = useChatInfiniteScroll()

  const scrollContainerRefSetter = useCallback(
    (node: HTMLDivElement) => {
      scrollContainerRef.current = node
      refs.rootRef(node)
    },
    [refs.rootRef]
  )

  const { currentChat } = useSnapshot(chatsStore)
  const { llmModels } = useSnapshot(appInfoStore)
  const effectiveModel = currentChat?.llmModel
    ? llmModels.find((m) => m.value === currentChat.llmModel)
    : null
  const isPremiumActive = effectiveModel?.isPremium ?? false
  const premiumTipKey =
    currentChat?.id && effectiveModel?.value ? `${currentChat.id}:${effectiveModel.value}` : null
  const [dismissedPremiumTipKey, setDismissedPremiumTipKey] = useState<string | null>(null)

  useEffect(() => {
    if (premiumTipKey) setDismissedPremiumTipKey(null)
  }, [premiumTipKey])

  const tipIsVisible =
    isPremiumActive && premiumTipKey !== null && dismissedPremiumTipKey !== premiumTipKey

  useChatScroll({ scrollContainerRef, layoutDeps: [tipIsVisible] })

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      <div
        ref={scrollContainerRefSetter}
        className="flex-1 min-h-0 pt-8 pb-6 px-6 overflow-y-auto scrollbar-gutter-edge"
      >
        <div className="flex flex-col gap-6 grow max-w-5xl mx-auto px-0.5">
          {hasMoreMessages && <div ref={refs.sentryRef} />}

          {visibleHistory.map((group, visibleIndex) => {
            const actualIndex = Math.max(0, lastMessageIndex) + visibleIndex
            return <ChatHistoryGroup key={actualIndex} group={group} historyIndex={actualIndex} />
          })}
        </div>
      </div>
      {tipIsVisible && effectiveModel && (
        <div className="shrink-0 px-6 py-2">
          <ChatPremiumModelTip
            modelLabel={effectiveModel.label}
            onDismiss={() => setDismissedPremiumTipKey(premiumTipKey)}
          />
        </div>
      )}
    </div>
  )
}

export default ChatHistory
