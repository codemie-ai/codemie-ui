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

import ChatHistoryGroup from './ChatHistoryGroup'
import { useChatInfiniteScroll } from './hooks/useChatInfiniteScroll'
import { useChatScroll } from './hooks/useChatScroll'

export interface ChatIndexes {
  historyIndex: number
  messageIndex: number
}

const ChatHistory = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useChatScroll({ scrollContainerRef })
  const { refs, visibleHistory, hasMoreMessages, lastMessageIndex } = useChatInfiniteScroll()

  const scrollContainerRefSetter = useCallback(
    (node: HTMLDivElement) => {
      scrollContainerRef.current = node
      refs.rootRef(node)
    },
    [refs.rootRef]
  )

  return (
    <div
      ref={scrollContainerRefSetter}
      className="grow w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter"
    >
      <div className="flex flex-col gap-6 grow max-w-5xl mx-auto px-0.5">
        {hasMoreMessages && <div ref={refs.sentryRef} />}

        {visibleHistory.map((group, visibleIndex) => {
          const actualIndex = Math.max(0, lastMessageIndex) + visibleIndex
          return <ChatHistoryGroup key={actualIndex} group={group} historyIndex={actualIndex} />
        })}
      </div>
    </div>
  )
}

export default ChatHistory
