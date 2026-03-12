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

import { vi, describe, it, expect, afterAll } from 'vitest'

import { decodeFileName, getRootPath } from '@/utils/helpers'

describe('decodeFileName', () => {
  it('should return an empty array if input is not base64 encoded', () => {
    const result = decodeFileName('invalidBase64')
    expect(result).toEqual([])
  })

  it('should handle empty input gracefully', () => {
    const result = decodeFileName('')
    expect(result).toEqual([])
  })

  it('should decode base64 encoded string with legacy separator', () => {
    const encoded = btoa('part1_part2_part3')
    const result = decodeFileName(encoded)
    expect(result).toEqual(['part1', 'part2', 'part3'])
  })

  it('should decode base64 encoded string with new format', () => {
    const part1 = 'part1'
    const part2 = 'частина2'
    const encoded = 'NX5wYXJ0MTh+0YfQsNGB0YLQuNC90LAy' // 5~part18~частина2

    const result = decodeFileName(encoded)
    expect(result).toEqual([part1, part2])
  })

  it('should handle a single part with no separators', () => {
    const encoded = btoa('singlepart')
    const result = decodeFileName(encoded)
    expect(result).toEqual(['singlepart'])
  })
})

describe('getRootPath', () => {
  it('returns correct local path', () => {
    vi.stubGlobal('window', {
      location: {
        host: 'localhost:3000',
      },
    })

    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_SUFFIX', '')

    const result = getRootPath()
    expect(result).toBe('http://localhost:3000')
  })

  it('returns correct prod path', () => {
    vi.stubGlobal('window', {
      location: {
        host: 'example.com',
      },
    })

    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_SUFFIX', '')

    const result = getRootPath()
    expect(result).toBe('https://example.com')
  })

  it('returns correct path with suffix', () => {
    vi.stubGlobal('window', {
      location: {
        host: 'myapp.com',
      },
    })

    vi.stubEnv('MODE', 'production')
    vi.stubEnv('VITE_SUFFIX', 'next_ui')

    const result = getRootPath()
    expect(result).toBe('https://myapp.com/next_ui')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })
})
