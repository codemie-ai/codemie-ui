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

import { customerConfigurationStore } from '@/store/customerConfiguration'

// The unit suite mocks the api client, so it asserts the call shape it was written with
// and cannot notice a wrapper the real client does not understand. This suite drives the
// real client and inspects what actually goes on the wire.
describe('customerConfigurationStore request bodies', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      type: 'basic',
      json: () => Promise.resolve({ component_id: 'chatDisclaimer', settings: {} }),
      clone: () => ({ json: () => Promise.resolve({}) }),
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body)

  it('sends the settings object at the top level of the request body', async () => {
    await customerConfigurationStore.saveSetting('chatDisclaimer', {
      enabled: true,
      text: 'Mind the gap',
    })

    expect(sentBody()).toEqual({ settings: { enabled: true, text: 'Mind the gap' } })
  })

  it('does not wrap the body in a client-specific envelope', async () => {
    await customerConfigurationStore.saveSetting('chatDisclaimer', { enabled: true, text: 'hi' })

    expect(sentBody()).not.toHaveProperty('json')
  })

  it('puts to the declarations path for the component', async () => {
    await customerConfigurationStore.saveSetting('chatDisclaimer', { enabled: false, text: '' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('v1/config/declarations/chatDisclaimer')
    expect(options.method).toBe('PUT')
  })

  it('deletes without a body envelope on reset', async () => {
    await customerConfigurationStore.resetSetting('chatDisclaimer')

    const [url, options] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('v1/config/declarations/chatDisclaimer')
    expect(options.method).toBe('DELETE')
  })
})
