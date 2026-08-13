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

import React, { useMemo } from 'react'

import ChevronLeftSvg from '@/assets/icons/chevron-left.svg?react'
import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'

interface ChatHistoryControlsProps {
  messageIndex: number
  totalMessages: number
  onChangeMessageIndex: (index: number) => void
}

const ChatHistoryControls: React.FC<ChatHistoryControlsProps> = ({
  messageIndex,
  totalMessages,
  onChangeMessageIndex,
}) => {
  const isFirstIndex = useMemo(() => messageIndex === 0, [messageIndex])

  const isLastIndex = useMemo(
    () => messageIndex === totalMessages - 1,
    [messageIndex, totalMessages]
  )

  const setPrevIndex = () => {
    if (!isFirstIndex) onChangeMessageIndex(messageIndex - 1)
  }

  const setNextIndex = () => {
    if (!isLastIndex) onChangeMessageIndex(messageIndex + 1)
  }

  if (totalMessages <= 1) return null

  return (
    <div className="flex items-center ml-auto select-none text-xs text-text-quaternary">
      <button
        type="button"
        aria-label="Previous version"
        disabled={isFirstIndex}
        onClick={setPrevIndex}
        className="mr-2 disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <ChevronLeftSvg aria-hidden="true" className="w-3 hover:opacity-100" />
      </button>
      {messageIndex + 1} / {totalMessages}
      <button
        type="button"
        aria-label="Next version"
        disabled={isLastIndex}
        onClick={setNextIndex}
        className="ml-2 disabled:opacity-25 disabled:cursor-not-allowed"
      >
        <ChevronRightSvg aria-hidden="true" className="w-3 hover:opacity-100" />
      </button>
    </div>
  )
}

export default ChatHistoryControls
