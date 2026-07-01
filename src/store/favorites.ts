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
  FavoriteItem,
  FavoritesFilters,
  ResourceType,
  UserPreferences,
} from '@/types/entity/favorites'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

import { assistantsStore } from './assistants'
import { preferencesStore } from './preferences'
import { skillsStore } from './skills'
import { userStore } from './user'
import { workflowsStore } from './workflows'

type FavoritesListKey = keyof UserPreferences['favorites']

const setFavoritedInStore = (resourceType: ResourceType, resourceId: string, value: boolean) => {
  const updater = <T extends { id: string; is_favorited?: boolean }>(arr: T[]): T[] =>
    arr.map((item) => (item.id === resourceId ? { ...item, is_favorited: value } : item))

  if (resourceType === 'assistant') assistantsStore.assistants = updater(assistantsStore.assistants)
  else if (resourceType === 'skill') skillsStore.skills = updater(skillsStore.skills)
  else workflowsStore.workflows = updater(workflowsStore.workflows)
}

const EMPTY_FAVORITES: UserPreferences['favorites'] = {
  assistants: [],
  workflows: [],
  skills: [],
}

const buildQuery = (filters: Partial<FavoritesFilters> = {}, page = 0, perPage = 12): string => {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('per_page', String(perPage))
  const searchValue = filters?.search || filters?.name
  if (searchValue) params.set('search', searchValue)
  if (filters?.created_by) params.set('created_by', filters.created_by)
  if (filters?.shared !== null && filters?.shared !== undefined)
    params.set('shared', String(filters.shared))
  if (filters?.visibility) params.set('visibility', filters.visibility)
  filters?.project?.forEach((p) => params.append('project', p))
  filters?.categories?.forEach((c) => params.append('categories', c))
  return params.toString()
}

interface FavoritesPagination {
  page: number
  perPage: number
  totalPages: number
  totalCount: number
}

interface FavoritesStoreType {
  favorites: FavoriteItem[]
  assistants: FavoriteItem[]
  skills: FavoriteItem[]
  workflows: FavoriteItem[]
  assistantsPagination: FavoritesPagination
  skillsPagination: FavoritesPagination
  workflowsPagination: FavoritesPagination
  loading: boolean
  error: string | null
  fetchFavorites: (filters?: Partial<FavoritesFilters>) => Promise<void>
  fetchFavoriteAssistants: (
    filters?: Partial<FavoritesFilters>,
    page?: number,
    perPage?: number
  ) => Promise<void>
  fetchFavoriteSkills: (
    filters?: Partial<FavoritesFilters>,
    page?: number,
    perPage?: number
  ) => Promise<void>
  fetchFavoriteWorkflows: (
    filters?: Partial<FavoritesFilters>,
    page?: number,
    perPage?: number
  ) => Promise<void>
  patchAssistantPinned: (assistantId: string, isPinned: boolean) => void
  patchAssistantReaction: (
    assistantId: string,
    isLiked: boolean,
    isDisliked: boolean,
    result?: { like_count?: number; dislike_count?: number }
  ) => void
  patchSkillReaction: (
    skillId: string,
    isLiked: boolean,
    isDisliked: boolean,
    result?: { like_count?: number; dislike_count?: number }
  ) => void
  addFavorite: (
    resourceType: ResourceType,
    resourceId: string,
    resourceName?: string
  ) => Promise<void>
  removeFavorite: (resourceType: ResourceType, resourceId: string) => Promise<void>
}

export const favoritesStore = proxy<FavoritesStoreType>({
  favorites: [],
  assistants: [],
  skills: [],
  workflows: [],
  assistantsPagination: { page: 0, perPage: 12, totalPages: 0, totalCount: 0 },
  skillsPagination: { page: 0, perPage: 12, totalPages: 0, totalCount: 0 },
  workflowsPagination: { page: 0, perPage: 12, totalPages: 0, totalCount: 0 },
  loading: false,
  error: null,

  patchAssistantPinned(assistantId, isPinned) {
    favoritesStore.assistants = favoritesStore.assistants.map((a) =>
      a.id === assistantId ? { ...a, is_pinned: isPinned } : a
    )
  },

  patchAssistantReaction(assistantId, isLiked, isDisliked, result) {
    favoritesStore.assistants = favoritesStore.assistants.map((a) =>
      a.id === assistantId
        ? {
            ...a,
            is_liked: isLiked,
            is_disliked: isDisliked,
            unique_likes_count: result?.like_count ?? a.unique_likes_count,
            unique_dislikes_count: result?.dislike_count ?? a.unique_dislikes_count,
          }
        : a
    )
  },

  patchSkillReaction(skillId, isLiked, isDisliked, result) {
    favoritesStore.skills = favoritesStore.skills.map((s) =>
      s.id === skillId
        ? {
            ...s,
            is_liked: isLiked,
            is_disliked: isDisliked,
            unique_likes_count: result?.like_count ?? (s as any).unique_likes_count,
            unique_dislikes_count: result?.dislike_count ?? (s as any).unique_dislikes_count,
          }
        : s
    )
  },

  async fetchFavorites(filters?: Partial<FavoritesFilters>) {
    favoritesStore.loading = true
    favoritesStore.error = null
    try {
      await Promise.all([
        favoritesStore.fetchFavoriteAssistants(filters),
        favoritesStore.fetchFavoriteSkills(filters),
        favoritesStore.fetchFavoriteWorkflows(filters),
      ])
      favoritesStore.favorites = [
        ...favoritesStore.assistants,
        ...favoritesStore.skills,
        ...favoritesStore.workflows,
      ]
    } catch {
      favoritesStore.error = 'Failed to load favorites'
    } finally {
      favoritesStore.loading = false
    }
  },

  async fetchFavoriteAssistants(filters?: Partial<FavoritesFilters>, page = 0, perPage = 12) {
    favoritesStore.error = null
    favoritesStore.loading = true
    try {
      const { userId } = userStore.user!
      const query = buildQuery(filters, page, perPage)
      const res = await api.get(`v1/preferences/${userId}/favorites/assistants?${query}`)
      const data = await res.json()
      const pinnedIds = preferencesStore.preferences?.pinned_assistants ?? []
      favoritesStore.assistants = (data.data ?? data).map((a: FavoriteItem) => ({
        ...a,
        is_pinned: pinnedIds.includes(a.id),
      }))
      favoritesStore.assistantsPagination = {
        page: data.page ?? page,
        perPage: data.per_page ?? perPage,
        totalPages: data.pages ?? 1,
        totalCount: data.total ?? 0,
      }
    } catch {
      favoritesStore.error = 'Failed to load favorites'
    } finally {
      favoritesStore.loading = false
    }
  },

  async fetchFavoriteSkills(filters?: Partial<FavoritesFilters>, page = 0, perPage = 12) {
    favoritesStore.error = null
    favoritesStore.loading = true
    try {
      const { userId } = userStore.user!
      const query = buildQuery(filters, page, perPage)
      const res = await api.get(`v1/preferences/${userId}/favorites/skills?${query}`)
      const data = await res.json()
      const skills: FavoriteItem[] = data.data ?? data
      const reactions = await skillsStore.getUserReactions()
      const reactionMap = new Map(
        reactions.map((r) => [r.resource_id || r.resourceId || r.skill_id, r.reaction])
      )
      favoritesStore.skills = skills.map((s) => ({
        ...s,
        is_liked: reactionMap.get(s.id) === 'like',
        is_disliked: reactionMap.get(s.id) === 'dislike',
      }))
      favoritesStore.skillsPagination = {
        page: data.page ?? page,
        perPage: data.per_page ?? perPage,
        totalPages: data.pages ?? 1,
        totalCount: data.total ?? 0,
      }
    } catch {
      favoritesStore.error = 'Failed to load favorites'
    } finally {
      favoritesStore.loading = false
    }
  },

  async fetchFavoriteWorkflows(filters?: Partial<FavoritesFilters>, page = 0, perPage = 12) {
    favoritesStore.error = null
    favoritesStore.loading = true
    try {
      const { userId } = userStore.user!
      const query = buildQuery(filters, page, perPage)
      const res = await api.get(`v1/preferences/${userId}/favorites/workflows?${query}`)
      const data = await res.json()
      favoritesStore.workflows = data.data ?? data
      favoritesStore.workflowsPagination = {
        page: data.page ?? page,
        perPage: data.per_page ?? perPage,
        totalPages: data.pages ?? 1,
        totalCount: data.total ?? 0,
      }
    } catch {
      favoritesStore.error = 'Failed to load favorites'
    } finally {
      favoritesStore.loading = false
    }
  },

  async addFavorite(resourceType: ResourceType, resourceId: string, resourceName?: string) {
    const { userId } = userStore.user!
    const current = preferencesStore.preferences?.favorites ?? { ...EMPTY_FAVORITES }
    const key: FavoritesListKey = `${resourceType}s` as FavoritesListKey
    const updated = { ...current, [key]: [...current[key], resourceId] }
    try {
      await preferencesStore.putPreferences(userId, { favorites: updated })
    } catch {
      toaster.error('Failed to add to favorites')
      return
    }
    setFavoritedInStore(resourceType, resourceId, true)
    const lookup = {
      [ResourceType.ASSISTANT]: () => assistantsStore.assistants.find((a) => a.id === resourceId),
      [ResourceType.SKILL]: () => skillsStore.skills.find((s) => s.id === resourceId),
      [ResourceType.WORKFLOW]: () => workflowsStore.workflows.find((w) => w.id === resourceId),
    }
    const found = resourceName ? { name: resourceName } : lookup[resourceType]?.()
    toaster.success(`Added to favorites<br>${found?.name} has been added to your favorites`)
  },

  async removeFavorite(resourceType: ResourceType, resourceId: string) {
    const { userId } = userStore.user!
    const current = preferencesStore.preferences?.favorites ?? { ...EMPTY_FAVORITES }
    const key: FavoritesListKey = `${resourceType}s` as FavoritesListKey
    const updated = { ...current, [key]: current[key].filter((id) => id !== resourceId) }
    try {
      await preferencesStore.putPreferences(userId, { favorites: updated })
    } catch {
      toaster.error('Failed to remove from favorites')
      return
    }
    setFavoritedInStore(resourceType, resourceId, false)
    favoritesStore[key] = (favoritesStore[key] as FavoriteItem[]).filter(
      (item) => item.id !== resourceId
    )
    favoritesStore.favorites = favoritesStore.favorites.filter((item) => item.id !== resourceId)
  },
})
