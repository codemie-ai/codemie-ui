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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import api from '@/utils/api'

describe('request headers', () => {
  const originalBase = api.BASE_URL

  beforeEach(() => {
    api.BASE_URL = 'https://api.example'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
  })

  afterEach(() => {
    api.BASE_URL = originalBase
    vi.restoreAllMocks()
  })

  const sentHeaders = () => new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers)

  it('sends caller headers next to the JSON content type and never follows redirects', async () => {
    await api.patch(
      'v1/hosted-applications/app-id',
      { name: 'Updated' },
      {
        headers: {
          'If-Match': '"app:app-id:4"',
          'Idempotency-Key': '00000000-0000-0000-0000-000000000001',
        },
      }
    )
    const options = vi.mocked(fetch).mock.calls[0][1]
    expect(sentHeaders().get('If-Match')).toBe('"app:app-id:4"')
    expect(sentHeaders().get('Idempotency-Key')).toBe('00000000-0000-0000-0000-000000000001')
    expect(sentHeaders().get('Content-Type')).toBe('application/json')
    expect(options?.redirect).toBe('manual')
  })

  it('passes an arbitrary header of any other feature through unchanged', async () => {
    const response = await api.get('v1/assistants', {
      headers: { 'X-Request-Id': 'request-123' },
      params: { page: 0 },
    })

    expect(response.ok).toBe(true)
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('https://api.example/v1/assistants?page=0')
    expect(sentHeaders().get('X-Request-Id')).toBe('request-123')
    expect(sentHeaders().get('Content-Type')).toBe('application/json')
  })

  it('lets a caller replace the default content type whatever its casing', async () => {
    await api.post('v1/files/notes', 'plain text', { headers: { 'content-type': 'text/plain' } })

    expect(sentHeaders().get('Content-Type')).toBe('text/plain')
  })

  it.each(['Authorization', 'Cookie', 'Host', 'user-id', 'USER-ID'])(
    'does not let a caller override the reserved %s header',
    async (header) => {
      await expect(
        api.post('v1/assistants', {}, { headers: { [header]: 'untrusted' } })
      ).rejects.toThrow('is managed by the API client')
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it('preserves abort signals', async () => {
    const controller = new AbortController()
    await api.get('v1/hosted-applications', { signal: controller.signal })
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBe(controller.signal)
  })
})
