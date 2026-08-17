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

import releaseNotes from '@/configs/releaseNotes.json'
import { CONFIG_KEYS } from '@/constants/configKeys'
import { ModelOption, SpeechConfig, ConfigItem } from '@/types/entity/configuration'
import api from '@/utils/api'

const TOOL_CONFIG_FIELD_MAP: Record<string, { credentialType: string; fields: string[] }> = {
  jiraconfig: { credentialType: 'jira', fields: ['url', 'cloud'] },
  confluenceconfig: { credentialType: 'confluence', fields: ['url', 'cloud'] },
  genericgitconfig: { credentialType: 'git', fields: ['url', 'auth_type'] },
  genericazuredevopsconfig: { credentialType: 'azuredevops', fields: ['url', 'auth_type'] },
  emailtoolconfig: { credentialType: 'email', fields: ['url', 'auth_type'] },
  xwikiconfig: { credentialType: 'xwiki', fields: ['url', 'use_bearer'] },
  keycloakconfig: { credentialType: 'keycloak', fields: ['base_url'] },
  xrayconfig: { credentialType: 'xray', fields: ['base_url'] },
  elasticconfig: { credentialType: 'elastic', fields: ['url'] },
  sonarconfig: { credentialType: 'sonar', fields: ['url'] },
  zephyrconfig: { credentialType: 'zephyrscale', fields: ['url'] },
  servicenowconfig: { credentialType: 'servicenow', fields: ['url'] },
  reportportalconfig: { credentialType: 'reportportal', fields: ['url'] },
  kubernetesconfig: { credentialType: 'kubernetes', fields: ['url'] },
  sharepointconfig: { credentialType: 'sharepoint', fields: ['url'] },
}

const VIEWED_RN_VERSION_KEY = 'codemie-viewed-release-version'
const ONBOARDING_COMPLETED_KEY = 'codemie-onboarding-completed'
const QUICK_ACTIONS_COLLAPSED_KEY = 'codemie-quick-actions-collapsed'
const NAVIGATION_EXPANDED_KEY = 'codemie-navigation-expanded'
const SIDEBAR_EXPANDED_KEY = 'codemie-sidebar-expanded'
const DATASOURCE_PER_PAGE_KEY = 'codemie-datasource-per-page'

const getStoredNavigationExpanded = () => localStorage.getItem(NAVIGATION_EXPANDED_KEY) === 'true'
const getStoredSidebarExpanded = () =>
  (localStorage.getItem(SIDEBAR_EXPANDED_KEY) ?? 'true') === 'true'

const APP_VERSION = '0.0.1'

export interface AppInfoStoreType {
  configs: ConfigItem[]
  isConfigFetched: boolean
  fetchCustomerConfig: () => Promise<ConfigItem[]>
  getIdpProvider: () => string
  getMcpAuthOrigin: () => string | null
  getMcpAuthTimeoutSeconds: () => string | null
  getBannerMessage: () => string
  getBannerLinkLabel: () => string
  getBannerLinkRoute: () => string

  description?: string
  appVersion: string
  apiVersion: string | null
  appReleases: any[]
  viewedAppReleaseVersion: string
  llmModels: ModelOption[]
  imageGenerationModels: ModelOption[]
  embeddingModels: ModelOption[]
  speechConfig: SpeechConfig
  navigationExpanded: boolean
  sidebarExpanded: boolean

  toolFieldDefaults: Record<string, string | boolean>
  toolFieldPlaceholders: Record<string, string>
  fetchToolConfigs: () => Promise<void>

  loadAppInfo: () => Promise<void>
  loadReleaseNotes: () => Promise<any[]>
  loadSpeechConfig: () => Promise<SpeechConfig>
  setViewedAppVersion: (version: string) => void
  isAppReleaseNew: () => boolean
  isOnboardingCompleted: () => boolean
  completeOnboarding: () => void
  getLLMModels: () => Promise<ModelOption[]>
  getImageGenerationModels: () => Promise<ModelOption[]>
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
  setSidebarExpanded: (expanded: boolean) => void
}

function extractConfigEntry(
  entry: Record<string, Record<string, unknown>>,
  defaults: Record<string, string | boolean>,
  placeholders: Record<string, string>
): void {
  const entries = Object.entries(entry)
  if (!entries.length) return
  const [configKey, configVal] = entries[0]
  if (!configVal || typeof configVal !== 'object') return
  const mapping = TOOL_CONFIG_FIELD_MAP[configKey.toLowerCase()]
  if (!mapping) return
  for (const fieldName of mapping.fields) {
    const field = configVal[fieldName] as Record<string, unknown> | undefined
    if (!field) continue
    const defaultVal = field.default
    if (defaultVal !== undefined && defaultVal !== null && defaultVal !== '') {
      defaults[`${mapping.credentialType}.${fieldName}`] = defaultVal as string | boolean
    }
    const placeholderVal = field.placeholder
    if (typeof placeholderVal === 'string' && placeholderVal) {
      placeholders[`${mapping.credentialType}.${fieldName}`] = placeholderVal
    }
  }
}

export const appInfoStore = proxy<AppInfoStoreType>({
  configs: [],
  isConfigFetched: false,
  navigationExpanded: getStoredNavigationExpanded(),
  sidebarExpanded: getStoredSidebarExpanded(),

  getIdpProvider(): string {
    const item = this.configs.find((c) => c.id === CONFIG_KEYS.IDP_PROVIDER)
    return item?.settings.value ?? 'keycloak'
  },

  getMcpAuthOrigin(): string | null {
    const item = this.configs.find((c) => c.id === CONFIG_KEYS.MCP_AUTH_ORIGIN)
    return item?.settings.value || null
  },

  getMcpAuthTimeoutSeconds(): string | null {
    return (
      this.configs.find((c) => c.id === CONFIG_KEYS.MCP_AUTH_TIMEOUT_SECONDS)?.settings.value ||
      null
    )
  },

  getBannerMessage(): string {
    return this.configs.find((c) => c.id === CONFIG_KEYS.BANNER_MESSAGE)?.settings.value ?? ''
  },

  getBannerLinkLabel(): string {
    return this.configs.find((c) => c.id === CONFIG_KEYS.BANNER_LINK_LABEL)?.settings.value ?? ''
  },

  getBannerLinkRoute(): string {
    return this.configs.find((c) => c.id === CONFIG_KEYS.BANNER_LINK_ROUTE)?.settings.value ?? ''
  },

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
  imageGenerationModels: [],
  embeddingModels: [],
  speechConfig: {},
  toolFieldDefaults: {},
  toolFieldPlaceholders: {},

  async fetchToolConfigs() {
    try {
      const response = await api.get('v1/tools/configs')
      const data: Array<Record<string, Record<string, unknown>>> = await response.json()
      if (!Array.isArray(data)) return
      const defaults: Record<string, string | boolean> = {}
      const placeholders: Record<string, string> = {}
      for (const entry of data) {
        if (entry == null) continue
        extractConfigEntry(entry, defaults, placeholders)
      }
      this.toolFieldDefaults = defaults
      this.toolFieldPlaceholders = placeholders
    } catch {
      // Non-fatal — form fields fall back to empty / unchecked
    }
  },

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
        provider: model.provider,
        isPremium: model.is_premium,
        multimodal: model.multimodal,
        supportsImageGeneration: model.supports_image_generation,
        supportsTools: model.features?.tools,
        defaultForCategories: model.default_for_categories,
        cost: model.cost ? { input: model.cost.input, output: model.cost.output } : undefined,
      }))
      return appInfoStore.llmModels
    } catch (error) {
      console.error('Failed to fetch LLM models:', error)
      return []
    }
  },

  async getImageGenerationModels() {
    try {
      const response = await api.get('v1/llm_models/image_generation')
      const data = await response.json()

      appInfoStore.imageGenerationModels = data.map((model: any) => ({
        value: model.base_name,
        label: model.label,
        isDefault: model.default,
      }))
      return appInfoStore.imageGenerationModels
    } catch (error) {
      console.error('Failed to fetch image generation models:', error)
      return []
    }
  },

  async getEmbeddingsModels() {
    try {
      const response = await api.get('v1/embeddings_models')
      const data = await response.json()
      appInfoStore.embeddingModels = data.map((model: any) => ({
        value: model.base_name,
        label: model.label,
      }))
      return appInfoStore.embeddingModels
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

  setSidebarExpanded(expanded: boolean) {
    this.sidebarExpanded = expanded
    localStorage.setItem(SIDEBAR_EXPANDED_KEY, expanded.toString())
  },
})
