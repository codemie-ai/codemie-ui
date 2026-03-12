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

import { ABILITIES } from '@/constants'

export interface Pagination {
  page: number
  perPage: number
  totalPages: number
  totalCount: number
}

export interface LoadMorePagination {
  perPage: number
  nextToken: string | null
}

export type UserAbility = (typeof ABILITIES)[keyof typeof ABILITIES]

export interface CreatedBy {
  id: string
  email: string
  name?: string
  username?: string
}

export interface PaginationBE {
  page: number
  per_page: number
  total: number
  pages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationBE
}

// ============================================================================
// Error Response Types
// ============================================================================

export interface ErrorDetails {
  message: string
  details?: string
  help?: string
}

export interface ErrorResponse {
  error: ErrorDetails
}
