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

import { Pagination } from '@/types/common'

export interface ActivityEventTypeInfo {
  event_type: string
  label: string
  category: string
}

export interface ActivityEventProjectMetadata {
  event_types: ActivityEventTypeInfo[]
  domains: string[]
  categories: string[]
  recording_enabled: boolean
}

export interface ActivityEventListItem {
  id: string
  domain: string
  event_type: string
  label: string
  category: string
  entity_type?: string
  entity_id?: string
  entity_label?: string
  project_name?: string
  actor_id?: string
  actor_email?: string
  actor_name?: string
  attributes?: Record<string, unknown>
  created_at: string
}

export interface ActivityEventPaginationBE {
  page: number
  per_page: number
  total: number
  pages: number
}

export interface ProjectActivityEventsResponse {
  data: ActivityEventListItem[]
  pagination: ActivityEventPaginationBE
  recording_enabled: boolean
}

export interface ProjectActivityEventsParams {
  category?: string[] | null
  domain?: string[] | null
  event_type?: string[] | null
  actor_id?: string | null
  from?: string | null
  to?: string | null
  sort_dir?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export function mapActivityEventPagination(be: ActivityEventPaginationBE): Pagination {
  return { page: be.page, perPage: be.per_page, totalCount: be.total, totalPages: be.pages }
}
