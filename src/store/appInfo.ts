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

import { proxy } from 'valtio'

import releaseNotes from '@/assets/configs/releaseNotes.json'
import { ModelOption, SpeechConfig, ConfigItem } from '@/types/entity/configuration'
import api from '@/utils/api'

const VIEWED_RN_VERSION_KEY = 'codemie-viewed-release-version'
const ONBOARDING_COMPLETED_KEY = 'codemie-onboarding-completed'
const QUICK_ACTIONS_COLLAPSED_KEY = 'codemie-quick-actions-collapsed'
const NAVIGATION_EXPANDED_KEY = 'codemie-navigation-expanded'
const SIDEBAR_EXPANDED_KEY = 'codemie-sidebar-expanded'
const DATASOURCE_PER_PAGE_KEY = 'codemie-datasource-per-page'

const APP_VERSION = '0.0.1'

export interface AppInfoStoreType {
  configs: ConfigItem[]
  isConfigFetched: boolean
  fetchCustomerConfig: () => Promise<ConfigItem[]>

  description?: string
  appVersion: string
  apiVersion: string | null
  appReleases: any[]
  viewedAppReleaseVersion: string
  llmModels: ModelOption[]
  embeddingModels: ModelOption[]
  speechConfig: SpeechConfig
  navigationExpanded: boolean
  sidebarExpanded: boolean

  loadAppInfo: () => Promise<void>
  loadReleaseNotes: () => Promise<any[]>
  loadSpeechConfig: () => Promise<SpeechConfig>
  setViewedAppVersion: (version: string) => void
  isAppReleaseNew: () => boolean
  isOnboardingCompleted: () => boolean
  completeOnboarding: () => void
  getLLMModels: () => Promise<ModelOption[]>
  getEmbeddingsModels: () => Promise<ModelOption[]>
  findLLMLabel: (value: string) => string
  findEmbeddingLabel: (value: string) => string
  toggleQuickActions: () => void
  isQuickActionsCollapsed: () => boolean
  getDataSourcesPerPage: () => string | null
  setDataSourcesPerPage: (value: string) => void
  toggleNavigationExpanded: () => void
  setIsNavigationExpanded: () => void
  toggleSidebar: () => void
  setIsSidebarExpanded: () => void
}

export const appInfoStore = proxy<AppInfoStoreType>({
  configs: [],
  isConfigFetched: false,
  navigationExpanded: false,
  sidebarExpanded: true,

  async fetchCustomerConfig() {
    if (this.isConfigFetched) {
      return this.configs
    }

    try {
      const response = await api.get('v1/config')
      this.configs = await response.json()
      this.isConfigFetched = true
      return this.configs
    } catch (error) {
      console.error('Error fetching config:', error)
      this.isConfigFetched = true
      return []
    }
  },

  appVersion: APP_VERSION,
  apiVersion: null,
  appReleases: [],
  viewedAppReleaseVersion: '',
  llmModels: [],
  embeddingModels: [],
  speechConfig: {},

  async loadAppInfo() {
    try {
      const response = await api.get('v1/info')
      const data = await response.json()
      this.apiVersion = data.version
      this.description = data.description
    } catch (error) {
      console.error('Error loading app info:', error)
    }
  },

  async loadReleaseNotes() {
    this.appReleases = releaseNotes
    this.viewedAppReleaseVersion = localStorage.getItem(VIEWED_RN_VERSION_KEY) ?? ''
    return releaseNotes
  },

  async loadSpeechConfig() {
    try {
      const response = await api.get('v1/speech/config')
      const data = await response.json()
      this.speechConfig = data
      return this.speechConfig
    } catch (error) {
      console.error('Failed to fetch speech config:', error)
      return {}
    }
  },

  setViewedAppVersion(version: string) {
    localStorage.setItem(VIEWED_RN_VERSION_KEY, version)
    this.viewedAppReleaseVersion = version
  },

  isAppReleaseNew() {
    return this.viewedAppReleaseVersion !== this.appReleases[0]?.version
  },

  isOnboardingCompleted() {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true'
  },

  completeOnboarding() {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
  },

  async getLLMModels() {
    try {
      const response = await api.get('v1/llm_models')
      const data = await response.json()

      appInfoStore.llmModels = data.map((model: any) => ({
        value: model.base_name,
        label: model.label,
        isDefault: model.default,
      }))
      return appInfoStore.llmModels
    } catch (error) {
      console.error('Failed to fetch LLM models:', error)
      return []
    }
  },

  async getEmbeddingsModels() {
    try {
      const response = await api.get('v1/embeddings_models')
      const data = await response.json()
      this.embeddingModels = data.map((model: any) => ({
        value: model.base_name,
        label: model.label,
      }))
      return this.embeddingModels
    } catch (error) {
      console.error('Failed to fetch embedding models:', error)
      return []
    }
  },

  findLLMLabel(value: string) {
    const model = this.llmModels.find((m) => m.value === value)
    return model ? model.label : value
  },

  findEmbeddingLabel(value: string) {
    const model = this.embeddingModels.find((m) => m.value === value)
    return model ? model.label : value
  },

  toggleQuickActions() {
    const current = localStorage.getItem(QUICK_ACTIONS_COLLAPSED_KEY)
    localStorage.setItem(QUICK_ACTIONS_COLLAPSED_KEY, current === 'true' ? 'false' : 'true')
  },

  isQuickActionsCollapsed() {
    return localStorage.getItem(QUICK_ACTIONS_COLLAPSED_KEY) === 'true'
  },

  getDataSourcesPerPage() {
    return localStorage.getItem(DATASOURCE_PER_PAGE_KEY)
  },

  setDataSourcesPerPage(value: string) {
    if (value) localStorage.setItem(DATASOURCE_PER_PAGE_KEY, value)
  },

  toggleNavigationExpanded() {
    this.navigationExpanded = !this.navigationExpanded
    localStorage.setItem(NAVIGATION_EXPANDED_KEY, this.navigationExpanded.toString())
  },

  setIsNavigationExpanded() {
    this.navigationExpanded = localStorage.getItem(NAVIGATION_EXPANDED_KEY) === 'true'
  },

  toggleSidebar() {
    this.sidebarExpanded = !this.sidebarExpanded
    localStorage.setItem(SIDEBAR_EXPANDED_KEY, this.sidebarExpanded.toString())
  },

  setIsSidebarExpanded() {
    const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
    if (stored) {
      this.sidebarExpanded = stored === 'true'
    }
  },
})
