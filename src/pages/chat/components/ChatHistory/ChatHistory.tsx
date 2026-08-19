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

import { useCallback, useRef } from 'react'

import { usePremiumModelTip } from '@/pages/chat/hooks/usePremiumModelTip'

import ChatHistoryGroup from './ChatHistoryGroup'
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

  // The tip itself renders from ChatPremiumModelTipSlot, one level up, but it
  // still changes the height available to this scroll container — so keep
  // feeding its visibility to useChatScroll to preserve the re-anchor (CR-001).
  const { tipIsVisible } = usePremiumModelTip()

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
    </div>
  )
}

export default ChatHistory
