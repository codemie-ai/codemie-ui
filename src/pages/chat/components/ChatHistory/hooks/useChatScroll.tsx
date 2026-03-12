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

import { RefObject, useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { chatsStore } from '@/store/chats'

const STICK_TO_BOTTOM_GAP = 50

export const useChatScroll = ({
  scrollContainerRef,
}: {
  scrollContainerRef: RefObject<HTMLDivElement | null>
}) => {
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const shouldStickToBottom = useRef(true)

  const scrollToBottom = (behavior: ScrollBehavior = 'instant') => {
    const scrollContainer = scrollContainerRef.current

    if (scrollContainer) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentChat?.id])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return () => {}

    const handleScroll = () => {
      shouldStickToBottom.current =
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight <
        STICK_TO_BOTTOM_GAP
    }

    scrollContainer.addEventListener('scroll', handleScroll)

    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (shouldStickToBottom.current) scrollToBottom()
  }, [currentChat?.history])
}
