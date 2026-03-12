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

/**
 * Maps API pagination response to internal pagination structure
 * Extracted to avoid code duplication across multiple methods
 *
 * @param apiPagination - Pagination object from API response
 * @returns Normalized pagination object
 */
export function mapPagination(apiPagination: {
  page: number
  per_page: number
  pages: number
  total: number
}): Pagination {
  return {
    page: apiPagination.page,
    perPage: apiPagination.per_page,
    totalPages: apiPagination.pages,
    totalCount: apiPagination.total,
  }
}
