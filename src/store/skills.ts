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

import { SKILLS_PER_PAGE, SKILL_INDEX_SCOPES } from '@/constants/skills'
import { Pagination } from '@/types/common'
import {
  Skill,
  SkillAssistantItem,
  SkillCategoryDefinition,
  SkillCreateRequest,
  SkillsFilters,
  SkillUpdateRequest,
  SkillVisibility,
} from '@/types/entity/skill'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

import { extractArrayFromResponse } from './utils/parseApiResponse'

interface SkillsStoreType {
  skills: Skill[]
  skillsPagination: Pagination
  skillCategories: SkillCategoryDefinition[]
  selectedSkill: Skill | null
  loading: boolean

  indexSkills: (filters?: SkillsFilters, page?: number, perPage?: number) => Promise<Skill[]>
  getSkillById: (id: string) => Promise<Skill>
  createSkill: (data: SkillCreateRequest) => Promise<Skill>
  updateSkill: (id: string, data: SkillUpdateRequest) => Promise<Skill>
  deleteSkill: (id: string) => Promise<void>
  importSkill: (file: File, project: string, visibility: SkillVisibility) => Promise<Skill>
  exportSkill: (id: string) => Promise<Blob>
  getSkillsForProject: (project: string, search?: string) => Promise<Skill[]>
  getSkillCategories: () => Promise<SkillCategoryDefinition[]>
  reactToSkill: (skillId: string, reaction: 'like' | 'dislike') => Promise<void>
  removeReaction: (skillId: string) => Promise<void>
  publishToMarketplace: (skillId: string, categories?: string[]) => Promise<void>
  unpublishFromMarketplace: (skillId: string) => Promise<void>
  getUserReactions: () => Promise<
    Array<{ resource_id?: string; resourceId?: string; skill_id?: string; reaction: string }>
  >
  updateSkillsWithReactionStatus: () => Promise<void>
  attachSkillToAssistants: (
    skillId: string,
    assistants: Array<{ id: string; name: string }>
  ) => Promise<{
    results: Array<{ assistantId: string; assistantName: string; success: boolean; error?: string }>
    successCount: number
    failureCount: number
  }>
  getAssistantsUsingSkill: (skillId: string) => Promise<SkillAssistantItem[]>
}

export const skillsStore = proxy<SkillsStoreType>({
  skills: [],
  skillsPagination: {
    page: 0,
    perPage: SKILLS_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  skillCategories: [],
  selectedSkill: null,
  loading: false,

  async indexSkills(
    filters: SkillsFilters = {},
    page = 0,
    perPage = SKILLS_PER_PAGE
  ): Promise<Skill[]> {
    const url = `v1/skills?page=${page}&per_page=${perPage}&filters=${encodeURIComponent(
      JSON.stringify(filters)
    )}`

    try {
      skillsStore.loading = true
      const response = await api.get(url)
      const result = await response.json()

      const skills = extractArrayFromResponse<Skill>(result, ['data', 'skills', 'items'])
      const resultObj =
        result && typeof result === 'object'
          ? (result as Record<string, any>)
          : ({} as Record<string, any>)
      // Check for pagination in nested objects OR at root level
      const pagination: Record<string, any> =
        resultObj.pagination ?? resultObj.meta ?? resultObj.data?.pagination ?? resultObj

      // Update store
      skillsStore.skills = skills
      skillsStore.skillsPagination = {
        page: pagination.page ?? pagination.current_page ?? page,
        perPage: pagination.per_page ?? pagination.perPage ?? perPage,
        totalPages:
          pagination.pages ??
          pagination.total_pages ??
          pagination.lastPage ??
          (skills.length > 0 ? 1 : 0),
        totalCount: pagination.total ?? pagination.totalCount ?? skills.length,
      }

      // Update skills with user reaction status if viewing marketplace
      if (filters.scope === SKILL_INDEX_SCOPES.MARKETPLACE) {
        await skillsStore.updateSkillsWithReactionStatus()
        // Return the updated skills from the store (with reactions)
        return skillsStore.skills
      }

      return skills
    } catch (error) {
      console.error('[skillsStore.indexSkills] Error:', error)
      toaster.error('Failed to load skills')
      skillsStore.skills = []
      skillsStore.skillsPagination = {
        page: 0,
        perPage: SKILLS_PER_PAGE,
        totalPages: 0,
        totalCount: 0,
      }
      throw error
    } finally {
      skillsStore.loading = false
    }
  },

  async getSkillById(id: string): Promise<Skill> {
    const url = `v1/skills/${id}`

    try {
      skillsStore.loading = true
      const response = await api.get(url)
      const skill = await response.json()

      skillsStore.selectedSkill = skill
      return skill
    } catch (error) {
      toaster.error('Failed to load skill')
      throw error
    } finally {
      skillsStore.loading = false
    }
  },

  async createSkill(data: SkillCreateRequest): Promise<Skill> {
    const url = 'v1/skills'

    try {
      skillsStore.loading = true
      const response = await api.post(url, data)
      const result = await response.json()

      const newSkill = result.data
      skillsStore.skills = [newSkill, ...skillsStore.skills]
      return newSkill
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to create skill'
      toaster.error(errorMessage)
      throw error
    } finally {
      skillsStore.loading = false
    }
  },

  async updateSkill(id: string, data: SkillUpdateRequest): Promise<Skill> {
    const url = `v1/skills/${id}`

    try {
      skillsStore.loading = true
      const response = await api.put(url, data)
      const result = await response.json()

      const updatedSkill = result.data
      skillsStore.skills = skillsStore.skills.map((skill) =>
        skill.id === id ? updatedSkill : skill
      )
      if (skillsStore.selectedSkill?.id === id) {
        skillsStore.selectedSkill = updatedSkill
      }
      // Toast is shown in EditSkillForm component
      return updatedSkill
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to update skill'
      toaster.error(errorMessage)
      throw error
    } finally {
      skillsStore.loading = false
    }
  },

  async deleteSkill(id: string): Promise<void> {
    const url = `v1/skills/${id}`

    try {
      skillsStore.loading = true
      await api.delete(url)

      skillsStore.skills = skillsStore.skills.filter((skill) => skill.id !== id)
      if (skillsStore.selectedSkill?.id === id) {
        skillsStore.selectedSkill = null
      }
      toaster.success('Skill deleted successfully')
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to delete skill'
      toaster.error(errorMessage)
      throw error
    } finally {
      skillsStore.loading = false
    }
  },

  async importSkill(file: File, project: string, visibility: SkillVisibility): Promise<Skill> {
    const url = 'v1/skills/import'

    try {
      skillsStore.loading = true
      const fileContent = await file.text()
      const base64Content = btoa(fileContent)

      const payload = {
        file_content: base64Content,
        filename: file.name,
        project,
        visibility,
      }

      const response = await api.post(url, payload)
      const result = await response.json()

      const importedSkill = result.data
      skillsStore.skills = [importedSkill, ...skillsStore.skills]
      toaster.success('Skill imported successfully')
      return importedSkill
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to import skill'
      toaster.error(errorMessage)
      throw error
    } finally {
      skillsStore.loading = false
    }
  },

  async exportSkill(id: string): Promise<Blob> {
    const url = `v1/skills/${id}/export`

    try {
      const response = await api.get(url)
      return await response.blob()
    } catch (error) {
      toaster.error('Failed to export skill')
      throw error
    }
  },

  async getSkillsForProject(project: string, search?: string): Promise<Skill[]> {
    const filters: SkillsFilters = {
      scope: SKILL_INDEX_SCOPES.PROJECT_WITH_MARKETPLACE,
      project: [project],
    }
    if (search) {
      filters.search = search
    }

    const url = `v1/skills?filters=${encodeURIComponent(JSON.stringify(filters))}&per_page=100`

    try {
      const response = await api.get(url)
      const result = await response.json()

      return extractArrayFromResponse<Skill>(result, ['data', 'skills', 'items'])
    } catch (error) {
      console.error('[skillsStore.getSkillsForProject] Error:', error)
      toaster.error('Failed to load skills for project')
      throw error
    }
  },

  async getSkillCategories(): Promise<SkillCategoryDefinition[]> {
    const url = 'v1/skills/categories'

    try {
      const response = await api.get(url)
      const result = await response.json()

      const categories = extractArrayFromResponse<SkillCategoryDefinition>(result, [
        'data',
        'categories',
        'items',
      ])

      // Cache the categories in the store
      skillsStore.skillCategories = categories
      return categories
    } catch (error) {
      console.error('[skillsStore.getSkillCategories] Error:', error)
      // Return empty array on error, don't show toaster for categories
      // Components can handle empty state gracefully
      return []
    }
  },

  async reactToSkill(skillId: string, reaction: 'like' | 'dislike'): Promise<void> {
    const url = `v1/skills/${skillId}/reactions`

    try {
      const response = await api.post(url, { reaction })
      const result = await response.json()

      // Update skill in local state
      skillsStore.skills = skillsStore.skills.map((skill) => {
        if (skill.id === skillId) {
          return {
            ...skill,
            is_liked: result.reaction === 'like',
            is_disliked: result.reaction === 'dislike',
            unique_likes_count: result.likeCount,
            unique_dislikes_count: result.dislikeCount,
          }
        }
        return skill
      })

      // Update selected skill if it matches
      if (skillsStore.selectedSkill?.id === skillId) {
        skillsStore.selectedSkill = {
          ...skillsStore.selectedSkill,
          is_liked: result.reaction === 'like',
          is_disliked: result.reaction === 'dislike',
          unique_likes_count: result.likeCount,
          unique_dislikes_count: result.dislikeCount,
        }
      }
    } catch (error) {
      toaster.error('Failed to react to skill')
      throw error
    }
  },

  async removeReaction(skillId: string): Promise<void> {
    const url = `v1/skills/${skillId}/reactions`

    try {
      const response = await api.delete(url)

      // DELETE may return 204 No Content — guard the json parse
      let result: { likeCount?: number; dislikeCount?: number } = {}
      try {
        result = await response.json()
      } catch {
        // Response has no body (e.g. 204 No Content)
      }

      // Update skill in local state
      skillsStore.skills = skillsStore.skills.map((skill) => {
        if (skill.id === skillId) {
          return {
            ...skill,
            is_liked: false,
            is_disliked: false,
            unique_likes_count: result.likeCount ?? 0,
            unique_dislikes_count: result.dislikeCount ?? 0,
          }
        }
        return skill
      })

      // Update selected skill if it matches
      if (skillsStore.selectedSkill?.id === skillId) {
        skillsStore.selectedSkill = {
          ...skillsStore.selectedSkill,
          is_liked: false,
          is_disliked: false,
          unique_likes_count: result.likeCount ?? 0,
          unique_dislikes_count: result.dislikeCount ?? 0,
        }
      }
    } catch (error) {
      toaster.error('Failed to remove reaction')
      throw error
    }
  },

  async publishToMarketplace(skillId: string, categories?: string[]): Promise<void> {
    const url = `v1/skills/${skillId}/marketplace/publish`

    try {
      const payload = categories ? { categories } : {}
      await api.post(url, payload)

      // Update skill in local state
      skillsStore.skills = skillsStore.skills.map((skill) => {
        if (skill.id === skillId) {
          return {
            ...skill,
            visibility: SkillVisibility.PUBLIC,
            categories: categories ?? skill.categories,
          }
        }
        return skill
      })

      // Update selected skill if it matches
      if (skillsStore.selectedSkill?.id === skillId) {
        skillsStore.selectedSkill = {
          ...skillsStore.selectedSkill,
          visibility: SkillVisibility.PUBLIC,
          categories: categories ?? skillsStore.selectedSkill.categories,
        }
      }

      toaster.info('Skill has been published to marketplace successfully!')
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to publish skill to marketplace'
      toaster.error(errorMessage)
      throw error
    }
  },

  async unpublishFromMarketplace(skillId: string): Promise<void> {
    const url = `v1/skills/${skillId}/marketplace/unpublish`

    try {
      await api.post(url, {})

      // Update skill in local state
      skillsStore.skills = skillsStore.skills.map((skill) => {
        if (skill.id === skillId) {
          return {
            ...skill,
            visibility: SkillVisibility.PROJECT,
          }
        }
        return skill
      })

      // Update selected skill if it matches
      if (skillsStore.selectedSkill?.id === skillId) {
        skillsStore.selectedSkill = {
          ...skillsStore.selectedSkill,
          visibility: SkillVisibility.PROJECT,
        }
      }

      toaster.info('Skill has been unpublished from marketplace successfully!')
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to unpublish skill from marketplace'
      toaster.error(errorMessage)
      throw error
    }
  },

  async getUserReactions(): Promise<
    Array<{ resource_id?: string; resourceId?: string; skill_id?: string; reaction: string }>
  > {
    try {
      const response = await api.get('v1/user/reactions?resource_type=skills')
      const result = await response.json()
      return result.items ?? []
    } catch (error) {
      console.error('Error fetching user reactions for skills:', error)
      return []
    }
  },

  async updateSkillsWithReactionStatus(): Promise<void> {
    const currentSkills = skillsStore.skills ?? []
    if (currentSkills.length === 0) {
      return
    }

    try {
      const reactions = await skillsStore.getUserReactions()
      const reactionMap = new Map()

      reactions.forEach((item) => {
        // API returns resource_id (snake_case) for skills
        const skillId = item.resource_id || item.resourceId || item.skill_id
        if (skillId) {
          reactionMap.set(skillId, item.reaction)
        }
      })

      const updatedSkills = currentSkills.map((skill) => {
        const reaction = reactionMap.get(skill.id)
        const isLiked = reaction === 'like'
        const isDisliked = reaction === 'dislike'
        return {
          ...skill,
          is_liked: isLiked,
          is_disliked: isDisliked,
        }
      })

      skillsStore.skills = updatedSkills
    } catch (error) {
      console.error('Error updating skills with reaction status:', error)
    }
  },

  async attachSkillToAssistants(
    skillId: string,
    assistants: Array<{ id: string; name: string }>
  ): Promise<{
    results: Array<{ assistantId: string; assistantName: string; success: boolean; error?: string }>
    successCount: number
    failureCount: number
  }> {
    const url = `v1/skills/${skillId}/assistants/bulk-attach`
    const assistantIds = assistants.map((a) => a.id)

    try {
      const response = await api.post(url, { assistant_ids: assistantIds })
      const result = await response.json()

      const successCount = result.success_count ?? 0
      const totalRequested = result.total_requested ?? assistants.length
      const failures = result.failures ?? []
      const message = result.message ?? ''

      // Build results array from response
      const results: Array<{
        assistantId: string
        assistantName: string
        success: boolean
        error?: string
      }> = assistants.map((assistant) => {
        const failure = failures.find((f: any) => f.assistant_id === assistant.id)
        return {
          assistantId: assistant.id,
          assistantName: assistant.name,
          success: !failure,
          error: failure?.reason,
        }
      })

      // Show appropriate feedback
      if (successCount === totalRequested) {
        toaster.success(
          `Skill attached to ${successCount} assistant${successCount > 1 ? 's' : ''} successfully!`
        )
      } else if (successCount > 0) {
        toaster.info(
          `Skill attached to ${successCount} of ${totalRequested} assistants. ${failures.length} failed.`
        )
      } else {
        // Show backend message when all fail (e.g., "Skill attached to 0 of 2 assistants")
        toaster.error(message ?? 'Failed to attach skill to assistants')
      }

      return { results, successCount, failureCount: failures.length }
    } catch (error: any) {
      const errorMessage = error?.message ?? 'Failed to attach skill to assistants'
      toaster.error(errorMessage)

      // Return all as failed
      const results = assistants.map((assistant) => ({
        assistantId: assistant.id,
        assistantName: assistant.name,
        success: false,
        error: errorMessage,
      }))

      return { results, successCount: 0, failureCount: assistants.length }
    }
  },

  async getAssistantsUsingSkill(skillId: string): Promise<SkillAssistantItem[]> {
    const url = `v1/skills/${skillId}/assistants`

    try {
      const response = await api.get(url)
      const result = await response.json()

      // The API returns an array of AssistantListResponse
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.error('[skillsStore.getAssistantsUsingSkill] Error:', error)
      toaster.error('Failed to load assistants using this skill')
      throw error
    }
  },
})
