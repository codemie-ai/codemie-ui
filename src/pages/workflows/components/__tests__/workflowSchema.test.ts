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

import { baseWorkflowSchema } from '../workflowSchema'

const base = { name: 'w', guardrail_assignments: [] }

describe('baseWorkflowSchema categories', () => {
  it('defaults categories to [] when omitted', async () => {
    const result = await baseWorkflowSchema.validate(base)
    expect(result.categories).toEqual([])
  })
  it('accepts 0 categories', async () => {
    await expect(baseWorkflowSchema.validate({ ...base, categories: [] })).resolves.toBeTruthy()
  })
  it('accepts up to 3 categories', async () => {
    await expect(
      baseWorkflowSchema.validate({ ...base, categories: ['a', 'b', 'c'] })
    ).resolves.toBeTruthy()
  })
  it('rejects more than 3 categories', async () => {
    await expect(
      baseWorkflowSchema.validate({ ...base, categories: ['a', 'b', 'c', 'd'] })
    ).rejects.toThrow()
  })
  it('coerces null categories to []', async () => {
    const result = await baseWorkflowSchema.validate({ ...base, categories: null })
    expect(result.categories).toEqual([])
  })
})
