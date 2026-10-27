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

import LLMSelector from '@/pages/assistants/components/AssistantForm/components/LLMSelector'
import { chatsStore } from '@/store/chats'
import { routerToModelOption } from '@/utils/routerToModelOption'

const ChatConfigLlmSelector: FC = () => {
  const { currentChat, filteredModels, filteredRouters, filteredModelsProjectId } =
    useSnapshot(chatsStore)

  const onLlmModelChange = (llmModel: string | null) => {
    chatsStore.updateChat(currentChat!.id, { llmModel })
  }

  const llmModelValue = useMemo(() => {
    return currentChat?.llmModel
  }, [currentChat?.llmModel])

  const projectId = useMemo(() => {
    return currentChat?.projectId
  }, [currentChat?.projectId])

  // Mirrors ChatPromptLlmSelector's gate: while filteredModelsProjectId still names the
  // previous project, its filteredModels/filteredRouters are stale and must not leak in.
  const hasCurrentProjectModels =
    !currentChat?.projectId || filteredModelsProjectId === currentChat.projectId

  // Mirrors ChatPromptLlmSelector's modelsToDisplay/routersToDisplay exactly: a project chat
  // has ONE data source, the Set-filter pipeline below, for its whole lifecycle. undefined is
  // reserved for "no project at all" (LLMSelector then uses its own unscoped/global list, same
  // as the no-project case everywhere else). While there IS a project but the gate is stale —
  // mid-switch, or the fetch hasn't resolved yet — this returns [], never undefined, so
  // LLMSelector's filteredModels contract treats it as an authoritative "nothing yet" instead
  // of falling back to its own independent useProjectLLMModels fetch.
  // A failed getModelsForCurrentChat leaves the gate stale too, so the list stays [] (the
  // store toasts the error) until the chat or project changes — the same as
  // ChatPromptLlmSelector. There is no retry by design; recovery belongs in chatsStore.
  const mergedFilteredModels = useMemo(() => {
    let result
    if (currentChat?.projectId) {
      result = hasCurrentProjectModels
        ? [...filteredModels, ...filteredRouters.map(routerToModelOption)]
        : []
    }
    return result
  }, [currentChat?.projectId, hasCurrentProjectModels, filteredModels, filteredRouters])

  return (
    currentChat && (
      <LLMSelector
        label="LLM Model"
        placeholder="Default"
        defaultOptionLabelPrefix="Recommended"
        project={currentChat.project}
        value={llmModelValue ?? undefined}
        allowEmpty
        projectId={projectId}
        filteredModels={mergedFilteredModels}
        hint="Selecting LLM model in this field will force each assistant to use it while answering in this chat. 'Default' means using the model defined in the configuration of each assistant."
        onChange={onLlmModelChange}
      />
    )
  )
}

export default ChatConfigLlmSelector
