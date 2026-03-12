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

import LogoDarkSvg from '@/assets/images/logo-dark.svg?react'
import LogoLightSvg from '@/assets/images/logo-light.svg?react'
import Avatar from '@/components/Avatar/Avatar'
import { AvatarType } from '@/constants/avatar'
import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'

interface ChatPromptStartersProps {
  onStarterClick: (prompt: string) => void
}

const ChatPromptStarters: FC<ChatPromptStartersProps> = ({ onStarterClick }) => {
  const { currentChat } = useSnapshot(chatsStore) as typeof chatsStore
  const { assistants } = useSnapshot(assistantsStore) as typeof assistantsStore
  const [description, setDescription] = useState<string | null>(null)

  const lastAssistant = currentChat?.assistantData.find(
    ({ id }) => id === currentChat.assistantIds[0]
  )

  useEffect(() => {
    if (!lastAssistant) {
      setDescription(null)
      return
    }

    const cached = assistants.find((a) => a.id === lastAssistant.id)
    if (cached?.description) {
      setDescription(cached.description)
      return
    }

    assistantsStore
      .getAssistant(lastAssistant.id, true)
      .then((assistant) => setDescription(assistant.description ?? null))
      .catch(() => setDescription(null))
  }, [lastAssistant?.id])

  const title = lastAssistant
    ? 'Hi there, how can we help today?'
    : 'Start a conversation with an assistant'

  const subtitle = lastAssistant
    ? 'Your assistants are here to help with anything you need'
    : 'Ask anything or type @ and choose assistant from the list'

  return (
    <div className="flex justify-center py-8 grow w-full overflow-y-auto">
      <div className="flex flex-col items-center text-center my-auto px-12">
        {lastAssistant ? (
          <Avatar
            iconUrl={lastAssistant.iconUrl}
            name={lastAssistant.name}
            type={AvatarType.MEDIUM}
          />
        ) : (
          <>
            <LogoDarkSvg className="max-w-[56px] h-10 codemieLight:hidden" />
            <LogoLightSvg className="max-w-[56px] h-10 codemieDark:hidden" />
          </>
        )}

        {lastAssistant ? (
          <h1 className="text-2xl font-semibold mt-3">{lastAssistant.name}</h1>
        ) : (
          <h1 className="text-4xl font-medium leading-8 mt-3">{title}</h1>
        )}

        {lastAssistant && description ? (
          <p
            data-tooltip-id="react-tooltip"
            data-tooltip-content={description}
            className="max-w-sm mt-2 leading-5 text-text-quaternary text-sm line-clamp-3"
          >
            {description}
          </p>
        ) : (
          !lastAssistant && <div className="leading-5 text-text-quaternary mt-2">{subtitle}</div>
        )}

        {lastAssistant && (
          <p className="text-base font-medium leading-8 mt-2 mb-6 text-text-quaternary">{title}</p>
        )}

        {!!lastAssistant?.conversationStarters?.length && (
          <div className="grid justify-items-center grid-cols-[minmax(0,_32rem)]">
            {lastAssistant.conversationStarters.map((starter, i) => (
              <button
                key={`${lastAssistant.id}-${starter}-${i}`}
                type="button"
                className="bg-gradient1 bg-opacity-60 text-wrap break-word text-left max-w-full text-sm font-medium py-2 px-4 rounded-lg rounded-br-sm mb-3 focus:outline-none transition hover:brightness-125"
                onClick={() => onStarterClick(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatPromptStarters
