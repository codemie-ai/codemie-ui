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

export type ResourceType = 'assistant' | 'workflow' | 'skill'
export type FavoriteFilter = 'all' | ResourceType

export interface FavoriteItem {
  id: string
  icon_url: string
  name: string
  description: string
  type?: string
  is_global?: boolean | null
  shared?: boolean | null
  visibility?: string | null
  assistants_count?: number
  created_by?: { name?: string; username?: string; user_id?: string; id?: string } | null
  is_favorited?: boolean
  is_pinned?: boolean
  is_liked?: boolean
  is_disliked?: boolean
  unique_likes_count?: number
  unique_dislikes_count?: number
  user_abilities?: string[]
  categories?: string[]
}

export interface UserPreferences {
  user_id: string
  pinned_assistants: string[]
  favorites: {
    assistants: string[]
    workflows: string[]
    skills: string[]
  }
}

export interface FavoritesFilters extends Record<string, unknown> {
  search: string
  name: string
  project: string[]
  categories: string[]
  created_by: string
  shared: boolean | null
  visibility: string | null
}
