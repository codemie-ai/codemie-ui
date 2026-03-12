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

export enum KataLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum KataStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum KataProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface KataLink {
  title: string
  url: string
  type: string // "documentation", "video", "example"
}

export interface KataTag {
  id: string
  name: string
  description: string
}

export interface KataRole {
  id: string
  name: string
  description: string
}

export interface UserKataProgress {
  id: string | null
  user_id: string
  kata_id: string
  status: KataProgressStatus
  started_at: string | null
  completed_at: string | null
  user_reaction: 'like' | 'dislike' | null
}

export interface LeaderboardUser {
  user_id: string
  username: string
  completed_count: number
  in_progress_count: number
  rank: number
}

export interface AIKata {
  id: string
  title: string
  description: string
  steps: string // markdown content
  level: KataLevel
  creator_id: string
  duration_minutes: number
  tags: string[] // array of tag IDs
  roles: string[] // array of role IDs
  links?: KataLink[]
  references?: string[]
  status: KataStatus
  is_published: boolean
  date: string
  update_date?: string
  image_url?: string
  user_progress: UserKataProgress
  enrollment_count: number
  unique_likes_count: number
  unique_dislikes_count: number
  user_abilities?: string[]
  creator_name?: string
}

export interface AIKataListItem {
  id: string
  title: string
  description: string
  level: KataLevel
  duration_minutes: number
  tags: string[]
  status: KataStatus
  is_published: boolean
  date: string
  image_url?: string
  unique_likes_count: number
  unique_dislikes_count: number
  user_progress: UserKataProgress
  enrollment_count: number
  user_abilities?: string[]
  creator_name?: string
}

export interface AIKataRequest {
  title: string
  description: string
  steps: string
  level: KataLevel
  duration_minutes: number
  tags?: string[]
  roles?: string[]
  links?: KataLink[]
  references?: string[]
}

export interface KataUser {
  id: string
  username: string
  name: string
}

export interface KataFilters {
  search?: string
  level?: KataLevel
  tags?: string[]
  roles?: string[]
  status?: KataStatus
  author?: string
  progress_status?: string
}
