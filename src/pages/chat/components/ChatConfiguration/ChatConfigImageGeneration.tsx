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

import { FC, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import Switch from '@/components/form/Switch'
import LLMSelector from '@/pages/assistants/components/AssistantForm/components/LLMSelector'
import { chatsStore } from '@/store/chats'

const ChatConfigImageGeneration: FC = () => {
  const { currentChat, updateChat } = useSnapshot(chatsStore)

  const isEnabled = useMemo(() => {
    return !!currentChat?.enableImageGeneration
  }, [currentChat?.enableImageGeneration])

  const imageGenerationModel = useMemo(() => {
    return currentChat?.imageGenerationModel
  }, [currentChat?.imageGenerationModel])

  const handleToggle = (enabled: boolean) => {
    if (!currentChat) return

    updateChat(currentChat.id, {
      enableImageGeneration: enabled,
      imageGenerationModel: enabled ? currentChat.imageGenerationModel ?? null : null,
    })
  }

  const handleModelChange = (model: string) => {
    if (!currentChat) return

    updateChat(currentChat.id, {
      imageGenerationModel: model || null,
    })
  }

  return (
    currentChat && (
      <div className="mt-6 flex flex-col gap-4">
        <h4 className="font-semibold">Image generation</h4>
        <Switch
          label="Enable image generation"
          labelClassName="font-mono text-sm leading-6"
          value={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
        />
        {isEnabled && (
          <LLMSelector
            label="Image generation model"
            placeholder="Use assistant or system default"
            value={imageGenerationModel ?? undefined}
            allowEmpty
            modelType="imageGeneration"
            hint="When left empty, this conversation falls back to the assistant configuration and then the backend default."
            onChange={handleModelChange}
          />
        )}
      </div>
    )
  )
}

export default ChatConfigImageGeneration
