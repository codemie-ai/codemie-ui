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

import { describe, it, expect, vi } from 'vitest'

import { decodeFileName } from '@/utils/utils'

import { baseWorkflowSchema } from '../workflowSchema'

vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/utils')>()
  return { ...actual, decodeFileName: vi.fn() }
})

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

describe('baseWorkflowSchema icon_url', () => {
  it('accepts a backend file URL', async () => {
    vi.mocked(decodeFileName).mockReturnValue({
      originalFileName: 'icon.png',
      mimeType: 'image/png',
      user: 'user1',
    })

    await expect(
      baseWorkflowSchema.validate({ ...base, icon_url: '/v1/files/abc123' })
    ).resolves.toBeTruthy()
  })

  it('rejects a non-URL, non-backend-file string', async () => {
    vi.mocked(decodeFileName).mockImplementation(() => {
      throw new Error('decode error')
    })

    await expect(baseWorkflowSchema.validate({ ...base, icon_url: 'not-a-url' })).rejects.toThrow()
  })

  it('accepts a bare workflow icon token returned by uploadWorkflowIcon', async () => {
    vi.mocked(decodeFileName).mockReturnValue({
      originalFileName: 'workflow-icons/0123.png',
      mimeType: 'image/png',
      user: 'user1',
    })

    await expect(
      baseWorkflowSchema.validate({ ...base, icon_url: 'MTB+aW1h' })
    ).resolves.toBeTruthy()
  })

  it('rejects a bare token that does not name a workflow icon', async () => {
    vi.mocked(decodeFileName).mockReturnValue({
      originalFileName: 'notes.txt',
      mimeType: 'text/plain',
      user: 'user1',
    })

    await expect(baseWorkflowSchema.validate({ ...base, icon_url: 'MTB+aW1h' })).rejects.toThrow()
  })

  it('accepts a well-formed absolute http(s) URL', async () => {
    await expect(
      baseWorkflowSchema.validate({ ...base, icon_url: 'https://example.com/icon.png' })
    ).resolves.toBeTruthy()
  })

  it('accepts an ftp URL as the previous validator did, so existing icons keep saving', async () => {
    await expect(
      baseWorkflowSchema.validate({ ...base, icon_url: 'ftp://example.com/icon.png' })
    ).resolves.toBeTruthy()
  })

  it('rejects a malformed absolute URL', async () => {
    await expect(
      baseWorkflowSchema.validate({ ...base, icon_url: 'https://bad url' })
    ).rejects.toThrow()
  })
})
