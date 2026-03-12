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

import { FC, Fragment, useState } from 'react'

import { type ChatHistoryGroup as ChatHistoryGroupType } from '@/types/entity/conversation'

import ChatAiMessage from './ChatAiMessage/ChatAiMessage'
import ChatUserMessage from './ChatUserMessage/ChatUserMessage'

interface ChatHistoryGroupProps {
  group: ChatHistoryGroupType
  historyIndex: number
}

const ChatHistoryGroup: FC<ChatHistoryGroupProps> = ({ group, historyIndex }) => {
  const [activeMessageIndex, setActiveMessageIndex] = useState(group.length - 1)
  const activeMessage = group[activeMessageIndex] ?? {}

  return (
    <Fragment>
      <ChatUserMessage
        message={activeMessage}
        onSubmit={() => setActiveMessageIndex((prev) => prev + 1)}
        indexes={{
          historyIndex,
          messageIndex: activeMessageIndex,
        }}
      />

      <ChatAiMessage
        message={activeMessage}
        totalMessages={group.length}
        onChangeMessageIndex={setActiveMessageIndex}
        indexes={{
          historyIndex,
          messageIndex: activeMessageIndex,
        }}
      />
    </Fragment>
  )
}

export default ChatHistoryGroup
