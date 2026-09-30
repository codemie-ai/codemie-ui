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

import { describe, it, expect, vi, afterEach } from 'vitest'

import { reportCallbackDiagnostics } from '../mcpAuthDiagnostics'

vi.mock('@/utils/api', () => ({
  default: {
    BASE_URL: 'https://api.example.com/v1',
  },
}))

describe('reportCallbackDiagnostics', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('omits auth_config_id and opener_present when not given and caps waited_ms', async () => {
    const sendBeacon = vi.fn((_url: string, _data?: BodyInit | null) => true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon })

    reportCallbackDiagnostics({
      result: 'error',
      phase: 'window_closed_before_callback',
      waitedMs: 9_999_999,
    })

    expect(sendBeacon).toHaveBeenCalledTimes(1)
    expect(sendBeacon.mock.calls[0][0]).toBe(
      'https://api.example.com/v1/v1/mcp-auth/oauth2/callback-diagnostics'
    )
    const blob = sendBeacon.mock.calls[0][1] as unknown as Blob
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(blob)
    })
    expect(JSON.parse(text)).toEqual({
      result: 'error',
      waited_ms: 3_600_000,
      phase: 'window_closed_before_callback',
    })
  })
})
