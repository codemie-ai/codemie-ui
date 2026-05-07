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

import { CreatedBy } from '@/types/common'
import {
  AssistantToolkit,
  FieldRecommendation,
  ToolkitRecommendation,
} from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'

export enum SkillVisibility {
  PRIVATE = 'private',
  PROJECT = 'project',
  PUBLIC = 'public',
}

export enum SkillSortBy {
  CREATED_DATE = 'created_date',
  ASSISTANTS_COUNT = 'assistants_count',
  RELEVANCE = 'relevance',
}

export interface SkillCategoryDefinition {
  value: string
  label: string
}

export interface Skill {
  id: string
  name: string
  description: string
  content: string
  project: string
  visibility: SkillVisibility
  created_by?: CreatedBy | null
  categories: string[]
  version: string
  created_at?: string
  updated_at?: string
  usage_count?: number
  assistants_count?: number
  user_abilities?: string[]
  is_attached?: boolean
  // Reactions
  is_liked?: boolean
  is_disliked?: boolean
  unique_likes_count?: number
  unique_dislikes_count?: number
  toolkits?: AssistantToolkit[]
  mcp_servers?: MCPServerDetails[]
}

export interface SkillCreateRequest {
  name: string
  description: string
  content: string
  project: string
  visibility: SkillVisibility
  categories: string[]
  toolkits?: AssistantToolkit[]
  mcp_servers?: MCPServerDetails[]
}

export interface SkillUpdateRequest {
  name?: string
  description?: string
  content?: string
  project?: string
  visibility?: SkillVisibility
  categories?: string[]
  toolkits?: AssistantToolkit[]
  mcp_servers?: MCPServerDetails[]
}

export interface SkillAssistantItem {
  id: string
  name: string
  slug: string
  description: string
  icon_url?: string
  created_by?: {
    id: string
    name?: string
    username?: string
  }
  project?: string
}

export interface SkillAIRefineFields {
  name?: string
  description?: string
  instructions?: string
  categories?: string[]
  toolkits?: { toolkit: string; tools: { name: string; label: string }[] }[]
  refine_prompt?: string
}

export interface SkillAIRefineResponse {
  fields: FieldRecommendation[]
  toolkits: ToolkitRecommendation[]
}

export interface SkillAIGeneratedFields {
  name: string
  description: string
  instructions: string
  categories: string[]
  toolkits: { toolkit: string; tools: { name: string; label: string }[] }[]
}

export type SkillAIFieldMarkers = Record<keyof SkillAIGeneratedFields, boolean>

/**
 * Unified filter interface for skills - used for both UI state and API requests.
 * Backend supports both string and string[] for project field.
 */
export interface SkillsFilters extends Record<string, unknown> {
  search?: string
  project?: string[]
  visibility?: SkillVisibility | null
  categories?: string[]
  created_by?: string
  scope?: string
}
