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

export interface ActivityEvent {
  id: string
  domain: string
  event_type: string
  entity_type: string | null
  entity_id: string | null
  actor_id: string | null
  actor_email: string | null
  actor_name: string | null
  attributes: Record<string, unknown> | null
  created_at: string
}

export interface ActivityEventFilterOptions {
  domains: string[]
  event_types: string[]
  entity_types: string[]
}

export interface ActivityEventListParams {
  limit?: number
  offset?: number
  domain?: string[] | null
  event_type?: string[] | null
  entity_type?: string[] | null
  entity_id?: string | null
  actor_id?: string | null
  from?: string | null
  to?: string | null
  sort_dir?: 'asc' | 'desc'
}
