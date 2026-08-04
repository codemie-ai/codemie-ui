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

const useInitialDataFetch = () => {
  useEffect(() => {
    const fetchInitialData = async () => {
      const loadUser = async () => {
        try {
          await userStore.loadUser()
          return true
        } catch (error: unknown) {
          if (error instanceof Response && error.status === HTTP_STATUS.UNAUTHORIZED) return false
          throw error
        }
      }

      await appInfoStore.fetchCustomerConfig()
      const isUserLoaded = await loadUser()
      if (!isUserLoaded) return

      await preferencesStore.fetchPreferences(userStore.user!.userId)

      await assistantsStore.fetchPinnedAssistants().catch((error) => {
        console.error('[useInitialDataFetch] failed to fetch pinned assistants:', error)
      })
      chatsStore.getFolders().catch((error) => {
        console.error('[useInitialDataFetch] failed to fetch chat folders:', error)
      })
      chatsStore.getChats().catch((error) => {
        console.error('[useInitialDataFetch] failed to fetch chats:', error)
      })

      appInfoStore.loadAppInfo()
      appInfoStore.fetchToolConfigs()
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
