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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import api from '@/utils/api'

import { fetchMCPAuthStatus } from '../mcpAuthStatus'

vi.mock('@/utils/api', () => ({ default: { get: vi.fn() } }))

describe('fetchMCPAuthStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests the status of the mcp config quietly and returns the parsed body', async () => {
    const body = { mcp_config_id: 'cfg 1', status: 'authenticated' }
    vi.mocked(api.get).mockResolvedValue({ json: () => Promise.resolve(body) } as Response)

    const result = await fetchMCPAuthStatus('cfg 1')

    expect(api.get).toHaveBeenCalledWith('v1/mcp-auth/status?mcp_config_id=cfg%201', {
      skipErrorHandling: true,
    })
    expect(result).toBe(body)
  })
})
