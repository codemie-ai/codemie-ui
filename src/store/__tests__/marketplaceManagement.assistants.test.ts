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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'

const mockApiGet = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

function resetAssistantsSlice() {
  marketplaceManagementStore.entityKind = 'ASSISTANT'
  marketplaceManagementStore.assistants.items = []
  marketplaceManagementStore.assistants.total = 0
  marketplaceManagementStore.assistants.hasLoaded = false
}

describe('marketplaceManagementStore.loadAssistants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAssistantsSlice()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('requests all rows without page_size when no filter given', async () => {
    mockApiGet.mockResolvedValueOnce({
      json: async () => ({ total: 0, items: [] }),
    })

    await marketplaceManagementStore.loadAssistants()

    expect(mockApiGet).toHaveBeenCalledWith(
      'v1/marketplace-management/entities/assistants/marketplace-assistants',
      { skipErrorHandling: true }
    )
  })

  it('adds status=PENDING_REVIEW to the query when a status filter is provided', async () => {
    mockApiGet.mockResolvedValueOnce({
      json: async () => ({ total: 0, items: [] }),
    })

    await marketplaceManagementStore.loadAssistants('PENDING_REVIEW')

    expect(mockApiGet).toHaveBeenCalledWith(
      'v1/marketplace-management/entities/assistants/marketplace-assistants?status=PENDING_REVIEW',
      { skipErrorHandling: true }
    )
  })

  it('populates store.assistants.items and sets hasLoaded=true on success', async () => {
    const items = [
      {
        assistant_id: 'a1',
        name: 'Assistant One',
        marketplace_status: 'PENDING_REVIEW',
        is_verified: null,
        marketplace_decision_reason: null,
        gate_findings: [],
        categories: ['AI Tools'],
        submitted_at: 1700000000,
        submitted_by: 'user@example.com',
      },
      {
        assistant_id: 'a2',
        name: 'Assistant Two',
        marketplace_status: 'APPROVED',
        is_verified: true,
        marketplace_decision_reason: null,
        gate_findings: [{ severity: 'CRITICAL', rule: 'no-pii', message: 'PII detected' }],
        categories: [],
        submitted_at: null,
        submitted_by: null,
      },
    ]

    mockApiGet.mockResolvedValueOnce({
      json: async () => ({ total: 2, items }),
    })

    await marketplaceManagementStore.loadAssistants()

    expect(marketplaceManagementStore.assistants.items).toEqual(items)
    expect(marketplaceManagementStore.assistants.total).toBe(2)
    expect(marketplaceManagementStore.assistants.hasLoaded).toBe(true)
  })

  it('discards a stale response superseded by a later call', async () => {
    let resolveFirst: (v: unknown) => void = () => {}
    const firstResponse = new Promise((r) => {
      resolveFirst = r
    })

    const newerItems = [{ assistant_id: 'newer', name: 'Newer', gate_findings: [] }]

    mockApiGet.mockReturnValueOnce(firstResponse).mockResolvedValueOnce({
      json: async () => ({ total: 1, items: newerItems }),
    })

    const firstCall = marketplaceManagementStore.loadAssistants()
    const secondCall = marketplaceManagementStore.loadAssistants()
    await secondCall

    // Now resolve the stale first response — it must not overwrite the newer result.
    resolveFirst({
      json: async () => ({
        total: 9,
        items: [{ assistant_id: 'stale', name: 'Stale', gate_findings: [] }],
      }),
    })
    await firstCall

    expect(marketplaceManagementStore.assistants.items).toEqual(newerItems)
    expect(marketplaceManagementStore.assistants.total).toBe(1)
  })
})
