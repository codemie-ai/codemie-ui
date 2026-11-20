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

import { describe, it, expect } from 'vitest'

import { mapActivityEventPagination } from '../projectActivityEvent'

describe('mapActivityEventPagination', () => {
  it('maps BE page/per_page/total/pages onto the frontend Pagination shape', () => {
    const result = mapActivityEventPagination({ page: 1, per_page: 25, total: 60, pages: 3 })
    expect(result).toEqual({ page: 1, perPage: 25, totalCount: 60, totalPages: 3 })
  })
})
