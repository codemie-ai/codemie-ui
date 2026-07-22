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

import { useEffect } from 'react'

import { HTTP_STATUS } from '@/constants'
import { assistantsStore, chatsStore, userStore } from '@/store'
import { appInfoStore } from '@/store/appInfo'
import { applicationsStore } from '@/store/applications'
import { preferencesStore } from '@/store/preferences'
import { skillsStore } from '@/store/skills'
import { workflowsStore } from '@/store/workflows'

const fetchChatsAndMissingAvatarData = async () => {
  const chats = await chatsStore.getChats()
  if (!Array.isArray(chats)) return

  const knownIds = new Set([
    ...assistantsStore.assistants.map((assistant) => assistant.id),
    ...assistantsStore.recentAssistants.map((assistant) => assistant.id),
    ...assistantsStore.pinnedAssistants.map((assistant) => assistant.id),
  ])
  const missingIds = [
    ...new Set(
      chats
        .filter((chat) => chat.isGroup)
        .flatMap((chat) => chat.assistantIds)
        .filter((id) => id && !knownIds.has(id))
    ),
  ]

  if (missingIds.length) await assistantsStore.fetchAssistantsByIds(missingIds)

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
        .filter((id): id is string => Boolean(id) && !knownWorkflowIds.has(id))
    ),
  ]

  if (missingWorkflowIds.length) {
    await workflowsStore.fetchWorkflowsByIds(missingWorkflowIds)
  }
}

const useInitialDataFetch = () => {
  useEffect(() => {
    const fetchInitialData = async () => {
      await appInfoStore.fetchCustomerConfig()

      try {
        await userStore.loadUser()
      } catch (error: unknown) {
        if (error instanceof Response && error.status === HTTP_STATUS.UNAUTHORIZED) return
        throw error
      }

      await preferencesStore.fetchPreferences(userStore.user!.userId)

      await Promise.all([
        assistantsStore.getRecentAssistants().catch((error) => {
          console.error('[useInitialDataFetch] failed to fetch recent assistants:', error)
        }),
        assistantsStore.fetchPinnedAssistants().catch((error) => {
          console.error('[useInitialDataFetch] failed to fetch pinned assistants:', error)
        }),
        workflowsStore.getRecentWorkflows().catch((error) => {
          console.error('[useInitialDataFetch] failed to fetch recent workflows:', error)
        }),
      ])
      chatsStore.getFolders().catch((error) => {
        console.error('[useInitialDataFetch] failed to fetch chat folders:', error)
      })
      await fetchChatsAndMissingAvatarData().catch((error) => {
        console.error('[useInitialDataFetch] failed to fetch chats:', error)
      })

      appInfoStore.loadAppInfo()
      appInfoStore.getLLMModels()
      appInfoStore.getEmbeddingsModels()
      appInfoStore.setIsNavigationExpanded()
      appInfoStore.setIsSidebarExpanded()

      applicationsStore.fetchApplications()
      assistantsStore.loadShowNewAssistantAIPopup()

      assistantsStore.getAssistantCategories()
      skillsStore.getSkillCategories()
      assistantsStore.getDefaultAssistant()
      assistantsStore.getHelpAssistants()
    }

    fetchInitialData().catch((error) => {
      console.error('[useInitialDataFetch] failed to initialize application data:', error)
    })
  }, [])
}

export default useInitialDataFetch
