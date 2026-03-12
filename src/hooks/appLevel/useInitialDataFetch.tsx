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

import { assistantsStore, chatsStore, userStore } from '@/store'
import { appInfoStore } from '@/store/appInfo'
import { applicationsStore } from '@/store/applications'
import { skillsStore } from '@/store/skills'

const useInitialDataFetch = () => {
  useEffect(() => {
    const fetchInitialData = async () => {
      userStore.loadUser()
      chatsStore.getFolders()
      chatsStore.getChats()

      appInfoStore.loadAppInfo()
      appInfoStore.getLLMModels()
      appInfoStore.getEmbeddingsModels()
      appInfoStore.setIsNavigationExpanded()
      appInfoStore.setIsSidebarExpanded()

      applicationsStore.fetchApplications()
      assistantsStore.loadShowNewAssistantAIPopup()

      await appInfoStore.fetchCustomerConfig()

      appInfoStore.getLLMModels()

      assistantsStore.getAssistantCategories()
      skillsStore.getSkillCategories()
      assistantsStore.getDefaultAssistant()
      assistantsStore.getHelpAssistants()
      assistantsStore.getDefaultAssistant()
      assistantsStore.getHelpAssistants()
    }

    fetchInitialData()
  }, [])
}

export default useInitialDataFetch
