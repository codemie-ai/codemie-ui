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

import { ChatListItem } from '@/types/entity/conversation'

import { assistantsStore } from '../assistants'
import { workflowsStore } from '../workflows'

export const fetchMissingChatAvatarData = async (chats: ChatListItem[]) => {
  const knownAssistantIds = new Set([
    ...assistantsStore.assistants.map((assistant) => assistant.id),
    ...assistantsStore.recentAssistants.map((assistant) => assistant.id),
    ...assistantsStore.pinnedAssistants.map((assistant) => assistant.id),
    ...assistantsStore.chatAssistants.map((assistant) => assistant.id),
  ])
  const missingAssistantIds = [
    ...new Set(
      chats
        .filter((chat) => chat.isGroup)
        .flatMap((chat) => chat.assistantIds)
        .filter((id) => id && !knownAssistantIds.has(id))
    ),
  ]

  const knownWorkflowIds = new Set([
    ...workflowsStore.workflows.map((workflow) => workflow.id),
    ...workflowsStore.recentWorkflows.map((workflow) => workflow.id),
    ...workflowsStore.chatWorkflows.map((workflow) => workflow.id),
  ])
  const missingWorkflowIds = [
    ...new Set(
      chats
        .filter((chat) => chat.isWorkflow)
        .map((chat) => chat.initialWorkflowId)
        .filter(
          (id): id is string => typeof id === 'string' && id.length > 0 && !knownWorkflowIds.has(id)
        )
    ),
  ]

  await Promise.all([
    missingAssistantIds.length
      ? assistantsStore.fetchAssistantsByIds(missingAssistantIds)
      : Promise.resolve(),
    missingWorkflowIds.length
      ? workflowsStore.fetchWorkflowsByIds(missingWorkflowIds)
      : Promise.resolve(),
  ])
}
