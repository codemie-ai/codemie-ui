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
import { cn } from '@/utils/utils'

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
      <ChevronLeftSvg
        onClick={setPrevIndex}
        className={cn(
          'mr-2 cursor-pointer w-3 hover:opacity-100',
          isFirstIndex && 'pointer-events-none opacity-25'
        )}
      />
      {messageIndex + 1} / {totalMessages}
      <ChevronRightSvg
        onClick={setNextIndex}
        className={cn(
          'ml-2 cursor-pointer w-3 hover:opacity-100',
          isLastIndex && 'pointer-events-none opacity-25'
        )}
      />
    </div>
  )
}

export default ChatHistoryControls
