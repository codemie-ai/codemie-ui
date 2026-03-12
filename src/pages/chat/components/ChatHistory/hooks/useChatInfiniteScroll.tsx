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

import { useCallback, useEffect, useState } from 'react'
import useInfiniteScroll from 'react-infinite-scroll-hook'
import { useSnapshot } from 'valtio'

import { chatsStore } from '@/store/chats'

const INITIAL_MESSAGES_COUNT = 5
const LOAD_MORE_COUNT = 5
const INFINITE_SCROLL_TRIGGER_MARGIN = '400px 0px 0px 0px'

export const useChatInfiniteScroll = () => {
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const [visibleMessagesCount, setVisibleMessagesCount] = useState(INITIAL_MESSAGES_COUNT)

  const totalMessages = currentChat?.history.length ?? 0
  const hasMoreMessages = visibleMessagesCount < totalMessages
  const visibleHistory = currentChat?.history.slice(-visibleMessagesCount) ?? []

  const loadMoreMessages = useCallback(() => {
    if (!hasMoreMessages) return
    setVisibleMessagesCount((prev) => Math.min(prev + LOAD_MORE_COUNT, totalMessages))
  }, [hasMoreMessages, totalMessages])

  const [sentryRef, { rootRef }] = useInfiniteScroll({
    delayInMs: 0,
    loading: false,
    rootMargin: INFINITE_SCROLL_TRIGGER_MARGIN,
    hasNextPage: hasMoreMessages,
    onLoadMore: loadMoreMessages,
  })

  useEffect(() => {
    setVisibleMessagesCount(INITIAL_MESSAGES_COUNT)
  }, [currentChat?.id])

  return {
    refs: {
      rootRef,
      sentryRef,
    },
    visibleHistory,
    hasMoreMessages,
    lastMessageIndex: totalMessages - visibleMessagesCount,
  }
}
