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

import { KATA_CONSTRAINTS } from '@/constants/katas'
import { Pagination } from '@/types/common'
import {
  AIKata,
  AIKataListItem,
  KataLevel,
  KataTag,
  KataRole,
  LeaderboardUser,
  KataProgressStatus,
  KataFilters,
  KataUser,
  KataStatus,
} from '@/types/entity/kata'
import api from '@/utils/api'

interface KataCreateRequest {
  title: string
  description: string
  steps: string
  level: KataLevel
  duration_minutes: number
  tags?: string[]
  roles?: string[]
  links?: Array<{ title: string; url: string; type: string }>
  references?: string[]
  image_url?: string
  is_published?: boolean
}

interface KataUpdateRequest {
  title: string
  description: string
  steps: string
  level: KataLevel
  duration_minutes: number
  tags?: string[]
  roles?: string[]
  links?: Array<{ title: string; url: string; type: string }>
  references?: string[]
  image_url?: string
}

interface KatasStoreType {
  katas: AIKataListItem[]
  currentKata: AIKata | null
  katasPagination: Pagination
  availableTags: KataTag[]
  availableRoles: KataRole[]
  availableUsers: KataUser[]
  leaderboard: LeaderboardUser[]
  cloneData: AIKata | null
  isLoading: boolean
  error: string | null

  fetchKatas: (filters?: KataFilters, page?: number, per_page?: number) => Promise<AIKataListItem[]>

  fetchKataById: (id: string) => Promise<AIKata>

  fetchKataTags: () => Promise<KataTag[]>

  fetchKataRoles: () => Promise<KataRole[]>

  fetchKataUsers: () => Promise<KataUser[]>

  createKata: (data: KataCreateRequest) => Promise<{ id: string }>

  updateKata: (kataId: string, data: KataUpdateRequest) => Promise<void>

  publishKata: (kataId: string) => Promise<void>

  unpublishKata: (kataId: string) => Promise<void>

  archiveKata: (kataId: string) => Promise<void>

  startKata: (kataId: string) => Promise<void>

  completeKata: (kataId: string) => Promise<void>

  fetchLeaderboard: (limit?: number) => Promise<LeaderboardUser[]>

  fetchMyProgress: (status?: KataProgressStatus) => Promise<AIKataListItem[]>

  reactToKata: (kataId: string, reaction: 'like' | 'dislike') => Promise<void>

  removeReaction: (kataId: string) => Promise<void>

  setCloneData: (kata: AIKata | null) => void

  clearCurrentKata: () => void
}

export const katasStore = proxy<KatasStoreType>({
  katas: [],
  currentKata: null,
  katasPagination: {
    page: 1,
    perPage: KATA_CONSTRAINTS.DEFAULT_PER_PAGE,
    totalPages: 0,
    totalCount: 0,
  },
  availableTags: [],
  availableRoles: [],
  availableUsers: [],
  leaderboard: [],
  cloneData: null,
  isLoading: false,
  error: null,

  async fetchKatas(filters?: KataFilters, page = 1, per_page = KATA_CONSTRAINTS.DEFAULT_PER_PAGE) {
    katasStore.isLoading = true
    katasStore.error = null

    try {
      let url = `v1/katas?page=${page}&per_page=${per_page}`

      // Encode filters as JSON if provided
      if (filters) {
        const activeFilters = Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) =>
              value !== undefined &&
              value !== null &&
              value !== '' &&
              !(Array.isArray(value) && value.length === 0)
          )
        )

        if (Object.keys(activeFilters).length > 0) {
          url += `&filters=${encodeURIComponent(JSON.stringify(activeFilters))}`
        }
      }

      const response = await api.get(url)
      const result = await response.json()

      if (result.data) {
        katasStore.katas = result.data

        if (result.pagination) {
          katasStore.katasPagination = {
            page: result.pagination.page,
            perPage: result.pagination.per_page,
            totalPages: result.pagination.pages,
            totalCount: result.pagination.total,
          }
        }
      }

      katasStore.isLoading = false
      return katasStore.katas
    } catch (error) {
      katasStore.isLoading = false
      katasStore.error = 'Failed to fetch katas'
      console.error('Error fetching katas:', error)
      return []
    }
  },

  async fetchKataById(id: string) {
    katasStore.isLoading = true
    katasStore.error = null

    try {
      const response = await api.get(`v1/katas/${id}`)
      const kata = await response.json()

      katasStore.currentKata = kata
      katasStore.isLoading = false
      return kata
    } catch (error) {
      katasStore.isLoading = false
      katasStore.error = 'Failed to fetch kata details'
      console.error('Error fetching kata:', error)
      throw error
    }
  },

  async fetchKataTags() {
    try {
      const response = await api.get('v1/katas/tags')
      const tags = await response.json()

      katasStore.availableTags = tags
      return tags
    } catch (error) {
      katasStore.error = 'Failed to fetch kata tags'
      console.error('Error fetching kata tags:', error)
      return []
    }
  },

  async fetchKataRoles() {
    try {
      const response = await api.get('v1/katas/roles')
      const roles = await response.json()

      katasStore.availableRoles = roles
      return roles
    } catch (error) {
      katasStore.error = 'Failed to fetch kata roles'
      console.error('Error fetching kata roles:', error)
      return []
    }
  },

  async fetchKataUsers() {
    try {
      const response = await api.get('v1/katas/users')
      const users = await response.json()

      katasStore.availableUsers = users
      return users
    } catch (error) {
      katasStore.error = 'Failed to fetch kata users'
      console.error('Error fetching kata users:', error)
      return []
    }
  },

  async createKata(data: KataCreateRequest) {
    try {
      const response = await api.post('v1/katas', data)
      return await response.json()
    } catch (error) {
      katasStore.error = 'Failed to create kata'
      console.error('Error creating kata:', error)
      throw error
    }
  },

  async updateKata(kataId: string, data: KataUpdateRequest) {
    try {
      const response = await api.put(`v1/katas/${kataId}`, data)
      await response.json()

      // Update the kata in the list if present
      const kataIndex = katasStore.katas.findIndex((k) => k.id === kataId)
      if (kataIndex !== -1) {
        katasStore.katas[kataIndex] = {
          ...katasStore.katas[kataIndex],
          title: data.title,
          description: data.description,
          level: data.level,
          duration_minutes: data.duration_minutes,
          tags: data.tags ?? [],
          image_url: data.image_url,
        }
      }

      // Update currentKata if it matches
      if (katasStore.currentKata && katasStore.currentKata.id === kataId) {
        katasStore.currentKata = {
          ...katasStore.currentKata,
          title: data.title,
          description: data.description,
          steps: data.steps,
          level: data.level,
          duration_minutes: data.duration_minutes,
          tags: data.tags ?? [],
          roles: data.roles ?? [],
          links: data.links,
          references: data.references,
          image_url: data.image_url,
        }
      }
    } catch (error) {
      katasStore.error = 'Failed to update kata'
      console.error('Error updating kata:', error)
      throw error
    }
  },

  async publishKata(kataId: string) {
    try {
      const response = await api.post(`v1/katas/${kataId}/publish`, {})
      await response.json()

      // Update the kata in the list if present
      const kata = katasStore.katas.find((k) => k.id === kataId)
      if (kata) {
        kata.is_published = true
        kata.status = KataStatus.PUBLISHED
      }

      // Update currentKata if it matches
      if (katasStore.currentKata && katasStore.currentKata.id === kataId) {
        katasStore.currentKata.is_published = true
        katasStore.currentKata.status = KataStatus.PUBLISHED
      }
    } catch (error) {
      console.error('Error publishing kata:', error)
      throw error
    }
  },

  async unpublishKata(kataId: string) {
    try {
      const response = await api.post(`v1/katas/${kataId}/unpublish`, {})
      await response.json()

      // Update the kata in the list if present
      const kata = katasStore.katas.find((k) => k.id === kataId)
      if (kata) {
        kata.is_published = false
        kata.status = KataStatus.DRAFT
      }

      // Update currentKata if it matches
      if (katasStore.currentKata && katasStore.currentKata.id === kataId) {
        katasStore.currentKata.is_published = false
        katasStore.currentKata.status = KataStatus.DRAFT
      }
    } catch (error) {
      console.error('Error unpublishing kata:', error)
      throw error
    }
  },

  async archiveKata(kataId: string) {
    try {
      const response = await api.post(`v1/katas/${kataId}/archive`, {})
      await response.json()

      // Update the kata in the list if present
      const kata = katasStore.katas.find((k) => k.id === kataId)
      if (kata) {
        kata.status = KataStatus.ARCHIVED
      }

      // Update currentKata if it matches
      if (katasStore.currentKata && katasStore.currentKata.id === kataId) {
        katasStore.currentKata.status = KataStatus.ARCHIVED
      }
    } catch (error) {
      console.error('Error archiving kata:', error)
      throw error
    }
  },

  async startKata(kataId: string) {
    try {
      const response = await api.post(`v1/katas/${kataId}/start`, {})
      await response.json()

      // Update local state
      if (katasStore.currentKata && katasStore.currentKata.id === kataId) {
        katasStore.currentKata.user_progress.status = KataProgressStatus.IN_PROGRESS
        katasStore.currentKata.user_progress.started_at = new Date().toISOString()
      }

      // Update kata in list if present
      const kata = katasStore.katas.find((k) => k.id === kataId)
      if (kata) {
        kata.user_progress.status = KataProgressStatus.IN_PROGRESS
        kata.user_progress.started_at = new Date().toISOString()
        kata.enrollment_count = (kata.enrollment_count ?? 0) + 1
      }
    } catch (error) {
      console.error('Error starting kata:', error)
      throw error
    }
  },

  async completeKata(kataId: string) {
    try {
      const response = await api.post(`v1/katas/${kataId}/complete`, {})
      await response.json()

      // Update local state
      if (katasStore.currentKata && katasStore.currentKata.id === kataId) {
        katasStore.currentKata.user_progress.status = KataProgressStatus.COMPLETED
        katasStore.currentKata.user_progress.completed_at = new Date().toISOString()
      }

      // Update kata in list if present
      const kata = katasStore.katas.find((k) => k.id === kataId)
      if (kata) {
        kata.user_progress.status = KataProgressStatus.COMPLETED
        kata.user_progress.completed_at = new Date().toISOString()
      }
    } catch (error) {
      console.error('Error completing kata:', error)
      throw error
    }
  },

  async fetchLeaderboard(limit = KATA_CONSTRAINTS.LEADERBOARD_LIMIT) {
    try {
      const response = await api.get(`v1/katas/leaderboard?limit=${limit}`)
      const result = await response.json()

      katasStore.leaderboard = result
      return result
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }
  },

  async fetchMyProgress(status?: KataProgressStatus) {
    try {
      let url = 'v1/katas/progress/my'
      if (status) {
        url += `?status=${status}`
      }

      const response = await api.get(url)
      return await response.json()
    } catch (error) {
      console.error('Error fetching my progress:', error)
      return []
    }
  },

  async reactToKata(kataId: string, reaction: 'like' | 'dislike') {
    try {
      const response = await api.post(`v1/katas/${kataId}/reactions`, { reaction })
      const result = await response.json()

      // Update local state with API response
      const kata = katasStore.katas.find((k) => k.id === kataId)
      if (kata) {
        kata.user_progress.user_reaction = result.reaction
        kata.unique_likes_count = result.like_count
        kata.unique_dislikes_count = result.dislike_count
      }

      // Update currentKata if it matches
      if (katasStore.currentKata && katasStore.currentKata.id === kataId) {
        katasStore.currentKata.user_progress.user_reaction = result.reaction
        katasStore.currentKata.unique_likes_count = result.like_count
        katasStore.currentKata.unique_dislikes_count = result.dislike_count
      }
    } catch (error) {
      console.error('Error reacting to kata:', error)
      throw error
    }
  },

  async removeReaction(kataId: string) {
    try {
      const response = await api.delete(`v1/katas/${kataId}/reactions`)
      const result = await response.json()

      // Update local state with API response
      const kata = katasStore.katas.find((k) => k.id === kataId)
      if (kata) {
        kata.user_progress.user_reaction = result.reaction
        kata.unique_likes_count = result.like_count
        kata.unique_dislikes_count = result.dislike_count
      }

      // Update currentKata if it matches
      if (katasStore.currentKata && katasStore.currentKata.id === kataId) {
        katasStore.currentKata.user_progress.user_reaction = result.reaction
        katasStore.currentKata.unique_likes_count = result.like_count
        katasStore.currentKata.unique_dislikes_count = result.dislike_count
      }
    } catch (error) {
      console.error('Error removing reaction:', error)
      throw error
    }
  },

  setCloneData(kata: AIKata | null) {
    katasStore.cloneData = kata
  },

  clearCurrentKata() {
    katasStore.currentKata = null
  },
})
