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

import {
  CHATBOT_ASSISTANT_SLUG,
  FEEDBACK_ASSISTANT_SLUG,
  ONBOARDING_ASSISTANT_SLUG,
  PROMPT_ENGINEER_SLUG,
  ASSISTANT_INDEX_SCOPES,
  AssistantIndexScope,
} from '@/constants/assistants'
import { Pagination } from '@/types/common'
import {
  Assistant,
  AssistantTemplate,
  AssistantToolkit,
  AssistantContext,
  AssistantAIGeneratedFields,
  AssistantCategory,
  AssistantPromptVariable,
  PublishValidationResponse,
  SubAssistantPublishSettings,
  AssistantAIRefineFields,
  AssistantAIRefineResponse,
  CreateAssistantDto,
  AssistantCreateResponse,
} from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import api from '@/utils/api'
import { FILTER_ENTITY, setFilters } from '@/utils/filters'
import { cleanObject } from '@/utils/helpers'
import storage from '@/utils/storage'

import { appInfoStore } from './appInfo'
import { userStore } from './user'
import { transformAssistantToCreateDTO } from './utils/assistants'

const RECENT_ASSISTANTS_STORAGE_KEY = 'recentAssistants'
const SHOW_NEW_ASST_AI_POPUP = 'codemie-new-asst-ai-popup'

interface AssistantsStoreType {
  assistants: Assistant[]
  assistantCategories: AssistantCategory[]
  assistantTemplates: AssistantTemplate[]
  assistantsPagination: Pagination
  recentAssistants: Assistant[]
  availableToolkits: AssistantToolkit[]
  availableContext: AssistantContext[]
  helpAssistants: any[]
  defaultAssistant: Assistant | null
  showNewAssistantAIPopup: boolean
  indexAssistants: (
    scope: string,
    filters?: Record<string, unknown>,
    page?: number,
    per_page?: number,
    minimal_response?: boolean,
    saveFilters?: boolean
  ) => Promise<Assistant[]>

  deleteAssistant: (id: string) => Promise<Response>
  deleteRecentAssistant: (id: string) => void
  updateRecentAssistants: (assistant: Assistant) => void
  getRecentAssistants: () => Promise<void | any[]>
  getHelpAssistants: () => Promise<void>
  getDefaultAssistant: () => Promise<void>
  loadAssistantTemplates: () => Promise<void>
  getAssistant: (id: string, skipErrorHandling?: boolean) => Promise<Assistant>
  getAssistantBySlug: (slug: string, skipErrorHandling?: boolean) => Promise<Assistant>
  doesAssistantBySlugExist: (slug: string) => Promise<boolean>
  getAssistantToolkits: () => Promise<AssistantToolkit[]>
  getToolSchema: (toolName: string, settingId?: string) => Promise<any>
  getPluginTools: (pluginSettingId?: string) => Promise<AssistantToolkit[]>
  getMcpTools: (mcpServer: MCPServerDetails) => Promise<AssistantToolkit[]>
  getAssistantContext: (project_name: string, withID?: boolean) => Promise<AssistantContext[]>
  getAssistantOptions: (
    search?: string,
    options?: { ids?: string[]; project?: string; per_page?: number },
    scope?: AssistantIndexScope
  ) => Promise<Assistant[]>
  getAllAssistantsOptions: (
    search?: string,
    options?: { ids?: string[]; project?: string }
  ) => Promise<Assistant[]>
  getAssistantTemplateBySlug: (slug: string) => Promise<Assistant>
  getAssistantCategories: () => Promise<void>
  validatePublishToMarketplace: (id: string) => Promise<PublishValidationResponse>
  publishAssistantToMarketplace: (
    id: string,
    categories?: string[],
    subAssistantsSettings?: SubAssistantPublishSettings[],
    ignoreRecommendations?: boolean
  ) => Promise<any>
  unpublishAssistantFromMarketplace: (id: string) => Promise<any>
  getUserReactions: () => Promise<any[]>
  updateAssistantsWithLikedStatus: () => Promise<any>
  reactToAssistant: (id: string, reaction: string) => Promise<any>
  removeReaction: (id: string) => Promise<any>
  getUserMapping: (assistantId: string) => Promise<any>
  saveUserMappingSettings: (assistantId: string, userMappingSettings: any) => Promise<any>

  showEditRemoteAssistantModal: boolean
  assistantToEdit: Assistant | null
  editMode: boolean
  viewMode: boolean
  createAssistant: (
    values: Assistant,
    skipIntegrationValidation?: boolean
  ) => Promise<AssistantCreateResponse>
  generateAssistantPromptWithAI: (
    prompt: string,
    existingPrompt: string
  ) => Promise<{ system_prompt: string }>
  updateRecentAssistant: (id: string, fields: Assistant) => void
  updateAssistant: (
    id: string,
    values: Assistant,
    skipIntegrationValidation?: boolean
  ) => Promise<AssistantCreateResponse>
  setShowNewAssistantAIPopup: (show: boolean) => void
  loadShowNewAssistantAIPopup: () => boolean
  generateAssistantWithAI: (
    prompt: string,
    includeTools: boolean
  ) => Promise<AssistantAIGeneratedFields>
  refineAssistantWithAI: (values: AssistantAIRefineFields) => Promise<AssistantAIRefineResponse>
  updateAvailableToolkits: (newAvailableToolkit: AssistantToolkit) => void
  testMCP: (mcpServer: MCPServerDetails) => Promise<{ success: boolean; message: string }>
  getAssistantUserPromptVars: (id: string) => Promise<Array<Record<string, string>>>
  updateAssistantUserPromptVariables: (
    id: string,
    variables: AssistantPromptVariable[]
  ) => Promise<{ error: string }>
  getRemoteAssistant: (url: string, project_name: string, integrationId?: string) => Promise<any>
  createRemoteAssistant: (data: any) => Promise<any>
  updateRemoteAssistant: (id: string, data: any) => Promise<any>
  exportAssistant: (id: string, envVariables?: Record<string, string>) => Promise<Blob>
}

export const MAX_RECENT_ASSISTANTS = 3

export const assistantsStore = proxy<AssistantsStoreType>({
  assistants: [],
  assistantTemplates: [],
  assistantsPagination: {
    page: 0,
    perPage: 12,
    totalPages: 0,
    totalCount: 0,
  },
  availableToolkits: [],
  availableContext: [],
  recentAssistants: [],
  helpAssistants: [],
  defaultAssistant: null,
  showEditRemoteAssistantModal: false,
  assistantToEdit: null,
  editMode: false,
  viewMode: false,
  showNewAssistantAIPopup: true,
  assistantCategories: [],

  indexAssistants(
    scope: string,
    filters: Record<string, unknown> = {},
    page = 0,
    per_page = 12,
    minimal_response = false,
    saveFilters = false
  ): Promise<Assistant[]> {
    const url =
      `v1/assistants?page=${page}` +
      `&per_page=${per_page}` +
      `&scope=${scope}` +
      `&filters=${encodeURIComponent(JSON.stringify(filters))}` +
      `&minimal_response=${minimal_response}`

    return api.get(url).then((response) => {
      return response.json().then((result) => {
        const { data, pagination } = result
        assistantsStore.assistants = data
        assistantsStore.assistantsPagination = {
          page: pagination.page,
          perPage: pagination.per_page,
          totalPages: pagination.pages,
          totalCount: pagination.total,
        }
        if (saveFilters) {
          setFilters(`${FILTER_ENTITY.ASSISTANTS}.${scope}`, filters)
        }
        assistantsStore.assistants = assistantsStore.assistants.map((assistant) => {
          return {
            ...assistant,
            is_global: scope === ASSISTANT_INDEX_SCOPES.MARKETPLACE ? true : assistant.is_global,
          }
        })
        assistantsStore.updateAssistantsWithLikedStatus().catch((error) => {
          console.error('Error updating likes for assistants:', error)
        })
        return data
      })
    })
  },

  loadAssistantTemplates() {
    return api
      .get('v1/assistants/prebuilt')
      .then((response) => response.json())
      .then((response) => {
        assistantsStore.assistantTemplates = response
      })
  },

  deleteAssistant(id) {
    assistantsStore.deleteRecentAssistant(id)
    return api.delete(`v1/assistants/${id}`)
  },

  deleteRecentAssistant(id) {
    const recentAssistant = assistantsStore.recentAssistants.find((item: any) => item.id === id)
    if (recentAssistant) {
      assistantsStore.recentAssistants.splice(
        assistantsStore.recentAssistants.indexOf(recentAssistant),
        1
      )
      storage.put(
        userStore.user!.userId,
        RECENT_ASSISTANTS_STORAGE_KEY,
        assistantsStore.recentAssistants
      )
    }
  },

  updateRecentAssistants(assistant: any) {
    const present = assistantsStore.recentAssistants.find((item) => item.id === assistant.id)
    if (present) {
      const index = assistantsStore.recentAssistants.indexOf(present)
      assistantsStore.recentAssistants.splice(index, 1)
      assistantsStore.recentAssistants.unshift({
        icon_url: assistant.icon_url,
        name: assistant.name,
        type: assistant.type,
        user_abilities: assistant.user_abilities,
        id: assistant.id,
      })
    } else {
      assistantsStore.recentAssistants.unshift({
        icon_url: assistant.icon_url,
        type: assistant.type,
        user_abilities: assistant.user_abilities,
        name: assistant.name,
        id: assistant.id,
      })
    }
    if (assistantsStore.recentAssistants.length > MAX_RECENT_ASSISTANTS) {
      assistantsStore.recentAssistants.pop()
    }
    storage.put(
      userStore.user!.userId,
      RECENT_ASSISTANTS_STORAGE_KEY,
      assistantsStore.recentAssistants
    )
  },

  getRecentAssistants() {
    const recentAssistants = storage.get(userStore.user!.userId, RECENT_ASSISTANTS_STORAGE_KEY)
    if (!recentAssistants?.length) {
      assistantsStore.recentAssistants = []
      return Promise.resolve([])
    }
    const filters = { id: recentAssistants.map((item: any) => item.id) }

    const url =
      `v1/assistants?page=${0}` +
      `&filters=${encodeURIComponent(JSON.stringify(filters))}` +
      `&scope=${ASSISTANT_INDEX_SCOPES.ALL}` +
      `&minimal_response=true`

    return api
      .get(url)
      .then((response: any) => response.json())
      .then((result: any) => {
        const { data } = result
        const recentAssistantsMap = new Map(
          recentAssistants.map((assistant: any, index: number) => [assistant.id, index])
        )
        data.sort(
          (a: any, b: any) => recentAssistantsMap.get(a.id)! - recentAssistantsMap.get(b.id)!
        )
        assistantsStore.recentAssistants = data
      })
  },

  async getAssistant(id, skipErrorHandling = false) {
    const assistant = await api
      .get(`v1/assistants/id/${id}`, { skipErrorHandling })
      .then((response) => response.json() as unknown as Assistant)

    // Return full nested assistants data including toolkits and mcp_servers
    // This allows SubAssistantUserMapping to configure integrations without additional API calls
    return {
      ...assistant,
      nestedAssistants: assistant.nested_assistants,
    }
  },

  async getAssistantBySlug(slug, skipErrorHandling = false) {
    return api
      .get(`v1/assistants/slug/${encodeURIComponent(slug)}`, { skipErrorHandling })
      .then((response) => response.json() as unknown as Assistant)
  },

  async doesAssistantBySlugExist(slug: string) {
    try {
      const result = await assistantsStore.getAssistantBySlug(slug, true)
      return !!result?.id
    } catch {
      return false
    }
  },

  async getAssistantToolkits() {
    const toolkits = await api.get('v1/assistants/tools').then((response) => response.json())
    assistantsStore.availableToolkits = toolkits
    return toolkits
  },

  async getToolSchema(toolName: string, settingId?: string) {
    let url = `v1/tools/${toolName}/schema`
    if (settingId) url += `?setting_id=${settingId}`
    return api.get(url, { skipErrorHandling: true }).then((response) => response.json())
  },

  async getPluginTools(pluginSettingId?: string) {
    let url = 'v1/assistants/plugin_tools'
    if (pluginSettingId) {
      url += `?plugin_setting_id=${pluginSettingId}`
    }

    return api.get(url, { skipErrorHandling: true }).then((response) => response.json())
  },

  async getMcpTools(mcpServer: MCPServerDetails) {
    return api
      .post('v1/assistants/mcp_tools', mcpServer, { skipErrorHandling: true })
      .then((response) => response.json())
  },

  getAssistantContext(project_name, withID = false) {
    return api
      .get(`v1/assistants/context?project_name=${project_name}`)
      .then((response) => response.json())
      .then((options) =>
        options.map((option) => ({
          ...(withID ? { id: option.id } : {}),
          name: option.name,
          context_type: option.context_type,
        }))
      )
      .then((contextOptions) => {
        assistantsStore.availableContext = contextOptions
        return contextOptions
      })
  },

  getAssistantOptions(
    search = '',
    { ids = [], project, per_page = 12 } = {},
    scope = ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER
  ) {
    const filters = {
      search,
      ...(ids.length ? { id: ids } : {}),
      ...(project ? { project } : {}),
    }
    const url =
      `v1/assistants?per_page=${per_page}` +
      `&scope=${scope}` +
      `&filters=${encodeURIComponent(JSON.stringify(cleanObject(filters)))}` +
      `&minimal_response=true`

    return api
      .get(url)
      .then((response) => response.json())
      .then((response) => response.data)
  },

  getAllAssistantsOptions(search = '', { ids = [], project } = {}) {
    return assistantsStore.getAssistantOptions(search, { ids, project }, ASSISTANT_INDEX_SCOPES.ALL)
  },

  getAssistantTemplateBySlug(slug) {
    return api.get(`v1/assistants/prebuilt/${slug}`).then((response) => response.json())
  },

  getAssistantCategories() {
    return api
      .get('v1/assistants/categories')
      .then((response) => response.json())
      .then((categories) => {
        assistantsStore.assistantCategories = categories
      })
  },

  validatePublishToMarketplace(id) {
    return api
      .post(`v1/assistants/${id}/marketplace/publish/validate`)
      .then((response) => response.json())
  },

  publishAssistantToMarketplace(
    id,
    categories,
    subAssistantsSettings,
    ignoreRecommendations = false
  ) {
    const body: {
      categories?: string[]
      sub_assistants_settings?: SubAssistantPublishSettings[]
      ignore_recommendations?: boolean
    } = {}
    if (categories) {
      body.categories = categories
    }
    if (subAssistantsSettings && subAssistantsSettings.length > 0) {
      body.sub_assistants_settings = subAssistantsSettings
    }
    if (ignoreRecommendations) {
      body.ignore_recommendations = true
    }
    return api
      .post(`v1/assistants/${id}/marketplace/publish`, body, { skipErrorHandling: true })
      .then((response) => response.json())
      .catch((errorResponse) => {
        // API returns response with parsedError when skipErrorHandling is true
        if (errorResponse.parsedError) {
          return { error: errorResponse.parsedError }
        }
        throw errorResponse
      })
  },

  unpublishAssistantFromMarketplace(id) {
    return api.post(`v1/assistants/${id}/marketplace/unpublish`).then((response) => response.json())
  },

  getUserReactions() {
    return api
      .get('v1/user/reactions')
      .then((response) => response.json())
      .then((response) => {
        return response.items ?? []
      })
  },

  updateAssistantsWithLikedStatus() {
    const currentAssistants = assistantsStore.assistants ?? []
    if (currentAssistants.length === 0) {
      return Promise.resolve()
    }
    return assistantsStore
      .getUserReactions()
      .then((reactions) => {
        const reactionMap = new Map()
        reactions.forEach((item) => {
          // New API returns resource_id (snake_case), old API returned assistant_id
          const assistantId = item.resource_id || item.resourceId || item.assistant_id
          if (assistantId) {
            reactionMap.set(assistantId, item.reaction)
          }
        })
        assistantsStore.assistants = currentAssistants.map((assistant) => ({
          ...assistant,
          is_liked: reactionMap.get(assistant.id) === 'like',
          is_disliked: reactionMap.get(assistant.id) === 'dislike',
        }))
        return reactions
      })
      .catch((error) => {
        console.error('Error updating assistants with reaction status:', error)
        return []
      })
  },

  reactToAssistant(id, reaction) {
    return api
      .post(`v1/assistants/${id}/reactions`, { reaction })
      .then((response) => response.json())
      .then((result) => {
        if (assistantsStore.assistants) {
          assistantsStore.assistants = assistantsStore.assistants.map((assistant) => {
            if (assistant.id === id) {
              return {
                ...assistant,
                is_liked: reaction === 'like',
                is_disliked: reaction === 'dislike',
                unique_likes_count:
                  result.like_count !== undefined
                    ? result.like_count
                    : assistant.unique_likes_count,
                unique_dislikes_count:
                  result.dislike_count !== undefined
                    ? result.dislike_count
                    : assistant.unique_dislikes_count,
              }
            }
            return assistant
          })
        }
        return result
      })
      .catch((error) => {
        console.error(`Error ${reaction}ing assistant:`, error)
        throw error
      })
  },

  removeReaction(id) {
    return api
      .delete(`v1/assistants/${id}/reactions`)
      .then((response) => response.json())
      .then((result) => {
        if (assistantsStore.assistants) {
          assistantsStore.assistants = assistantsStore.assistants.map((assistant) => {
            if (assistant.id === id) {
              return {
                ...assistant,
                is_liked: false,
                is_disliked: false,
                unique_likes_count:
                  result.like_count !== undefined
                    ? result.like_count
                    : assistant.unique_likes_count,
                unique_dislikes_count:
                  result.dislike_count !== undefined
                    ? result.dislike_count
                    : assistant.unique_dislikes_count,
              }
            }
            return assistant
          })
        }
        return result
      })
      .catch((error) => {
        console.error('Error removing reaction from assistant:', error)
        throw error
      })
  },

  async createAssistant(
    values: Assistant,
    skipIntegrationValidation = false
  ): Promise<AssistantCreateResponse> {
    const assistantData: CreateAssistantDto = {
      ...transformAssistantToCreateDTO(values),
      skip_integration_validation: skipIntegrationValidation,
    }

    try {
      const response = await api.post('v1/assistants', assistantData)
      return await response.json()
    } catch (error: any) {
      return {
        error: error.message ?? 'Failed to create assistant',
        message: error.message ?? 'Failed to create assistant',
        assistantId: null,
      }
    }
  },

  getUserMapping(assistantId) {
    return api
      .get(`v1/assistants/${assistantId}/users/mapping`)
      .then((response) => {
        if (response.ok) {
          return response.json()
        }
        return null
      })
      .catch((error) => {
        console.error('Error fetching user mapping:', error)
        return null
      })
  },

  saveUserMappingSettings(assistantId, userMappingSettings: Array<Record<string, any>>) {
    const tools_config = Object.entries(userMappingSettings)
      .filter(([_, setting]) => setting.settingId)
      .map(([_, setting]: any) => ({
        name: setting.originalName,
        integration_id: setting.settingId,
      }))
    return api
      .post(`v1/assistants/${assistantId}/users/mapping`, { tools_config })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error('Failed to save mapping'))
      )
  },

  generateAssistantPromptWithAI(text, existingPrompt) {
    return api
      .post('v1/assistants/prompt/generate', {
        text,
        system_prompt: existingPrompt,
      })
      .then((response) => response.json())
  },

  updateRecentAssistant(id, fields) {
    if (!userStore.user?.userId) return
    const assistant = assistantsStore.recentAssistants.find((item) => item.id === id)
    if (assistant) {
      assistant.name = fields.name
      assistant.icon_url = fields.icon_url
      storage.put(
        userStore.user?.userId,
        RECENT_ASSISTANTS_STORAGE_KEY,
        assistantsStore.recentAssistants
      )
    }
  },

  async updateAssistant(
    id: string,
    values: Assistant,
    skipIntegrationValidation = false
  ): Promise<AssistantCreateResponse> {
    const assistantData: CreateAssistantDto = {
      ...transformAssistantToCreateDTO(values),
      skip_integration_validation: skipIntegrationValidation,
    }

    try {
      const response = await api.put(`v1/assistants/${id}`, assistantData)
      const data = await response.json()
      assistantsStore.updateRecentAssistant(id, values)
      return data
    } catch (error: any) {
      return {
        error: error.message ?? 'Failed to update assistant',
        message: error.message ?? 'Failed to update assistant',
        assistantId: null,
      }
    }
  },

  setShowNewAssistantAIPopup(show = true) {
    localStorage.setItem(SHOW_NEW_ASST_AI_POPUP, show ? 'true' : 'false')
    assistantsStore.showNewAssistantAIPopup = show
  },

  loadShowNewAssistantAIPopup() {
    const show = localStorage.getItem(SHOW_NEW_ASST_AI_POPUP) !== 'false'
    assistantsStore.showNewAssistantAIPopup = show
    return show
  },

  generateAssistantWithAI(prompt, include_tools = true) {
    return api
      .post('v1/assistants/generate', {
        text: prompt,
        include_tools,
      })
      .then((response) => response.json())
  },

  refineAssistantWithAI(assistantConfig) {
    return api.post('v1/assistants/refine', assistantConfig).then((response) => response.json())
  },

  updateAvailableToolkits(newAvailableToolkit: AssistantToolkit) {
    assistantsStore.availableToolkits = assistantsStore.availableToolkits.filter(
      (tk) => tk.toolkit !== newAvailableToolkit.toolkit
    )
    assistantsStore.availableToolkits.unshift(newAvailableToolkit)
  },

  testMCP(mcpServer) {
    return api
      .post(`v1/assistants/mcp/test`, { mcp_server: mcpServer })
      .then((response) => response.json())
  },

  getAssistantUserPromptVars(assistantID) {
    return api
      .get(`v1/assistants/${assistantID}/users/prompt-variables`)
      .then((response) => response.json())
      .then((json) => json.variables_config)
  },

  updateAssistantUserPromptVariables(assistantID: string, variables: AssistantPromptVariable[]) {
    const vairablesPayload = variables.map((variable) => {
      return {
        variable_key: variable.key,
        variable_value: variable.default_value,
        is_sensitive: variable.is_sensitive ?? false,
      }
    })

    return api
      .post(`v1/assistants/${assistantID}/users/prompt-variables`, {
        variables_config: vairablesPayload,
      })
      .then((response) => response.json())
  },

  async getHelpAssistants() {
    const filters = {
      slug: [
        FEEDBACK_ASSISTANT_SLUG,
        CHATBOT_ASSISTANT_SLUG,
        ONBOARDING_ASSISTANT_SLUG,
        PROMPT_ENGINEER_SLUG,
      ],
    }
    const url =
      `v1/assistants?page=0` +
      `&filters=${encodeURIComponent(JSON.stringify(filters))}` +
      `&scope=${ASSISTANT_INDEX_SCOPES.ALL}` +
      `&minimal_response=true`

    try {
      const response = await api.get(url)
      const json = await response.json()
      assistantsStore.helpAssistants = json.data
    } catch (error) {
      console.error('Failed to fetch help assistants:', error)
    }
  },

  async getDefaultAssistant() {
    try {
      await appInfoStore.fetchCustomerConfig()
      const defaultAssistantConfig = appInfoStore.configs.find(
        (item) => item.id === 'defaultConversationAssistant'
      )

      // Try to get the configured default assistant
      let slugToUse = CHATBOT_ASSISTANT_SLUG
      if (defaultAssistantConfig?.settings.enabled && defaultAssistantConfig.settings.slug) {
        slugToUse = defaultAssistantConfig.settings.slug
      }

      const assistant = await assistantsStore.getAssistantBySlug(slugToUse, true)
      assistantsStore.defaultAssistant = assistant
    } catch (error) {
      console.error('Failed to fetch default assistant:', error)
      // If the configured assistant doesn't exist, try the chatbot assistant as fallback
      try {
        const chatbotAssistant = await assistantsStore.getAssistantBySlug(
          CHATBOT_ASSISTANT_SLUG,
          true
        )
        assistantsStore.defaultAssistant = chatbotAssistant
      } catch (fallbackError) {
        console.error('Failed to fetch chatbot assistant as fallback:', fallbackError)
      }
    }
  },

  getRemoteAssistant(url, project_name, integrationId) {
    let endpoint = `v1/a2a/assistants/fetch?url=${encodeURIComponent(
      url
    )}&project_name=${project_name}`

    if (integrationId) {
      endpoint += `&integration_id=${integrationId}`
    }

    return api.get(endpoint).then((response) => response.json())
  },

  createRemoteAssistant(data) {
    return api.post('v1/assistants', data).then((response) => response.json())
  },

  updateRemoteAssistant(id, data) {
    return api.put(`v1/assistants/${id}`, data).then((response) => response.json())
  },

  exportAssistant(id, envVariables = {}) {
    return api.post(`v1/assistants/id/${id}/export`, { env_vars: envVariables }).then((resp) => {
      if (resp.status === 200) {
        return resp.blob()
      }
      return Promise.reject(new Error('Failed to export assistant'))
    })
  },
})
