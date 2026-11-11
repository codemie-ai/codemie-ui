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

import { describe, expect, it } from 'vitest'

// This must stay the FIRST application import in this file. Every other test that touches these rows
// reaches them through a component, which enters the graph from the other side and hides an import
// cycle here. Loading the types module first is what exposes one: give this module a runtime
// dependency that reaches `@/utils/helpers` -> `@/router` -> the pages that render these rows, and
// the assertions below fail at module scope with a bare
// "Cannot read properties of undefined (reading 'map')" from a page component, one frame away from
// the real cause. Do not add an `@/...` import above this one.
import {
  getCategoryLimit,
  getCategorySpend,
  SPENDING_CATEGORY_KEYS,
  UserProjectSpendingRow,
} from '../userProjectSpending'

describe('userProjectSpending loaded as the first application module', () => {
  it('initialises SPENDING_CATEGORY_KEYS at module scope', () => {
    expect(SPENDING_CATEGORY_KEYS).toStrictEqual(['platform', 'cli', 'premium_models'])
  })

  it('reads a row through every accessor the module exports', () => {
    const row: UserProjectSpendingRow = {
      project_name: 'alpha',
      platform: 12.5,
      platform_limit: 100,
    }

    expect(getCategorySpend(row, 'platform')).toBe(12.5)
    expect(getCategoryLimit(row, 'platform')).toBe(100)
  })
})
