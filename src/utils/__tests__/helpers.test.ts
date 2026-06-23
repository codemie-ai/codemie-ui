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

import { vi, describe, it, expect, afterAll, beforeEach, afterEach } from 'vitest'

import { decodeFileName, getRootPath, formatScheduleDate } from '@/utils/helpers'

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

// Fixed: 2026-05-26 10:30 local time
describe('formatScheduleDate', () => {
  const FIXED_NOW = new Date(2026, 4, 26, 10, 30, 0, 0)
  const mins = (n: number) => new Date(FIXED_NOW.getTime() + n * 60_000)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('falsy inputs', () => {
    it('returns "—" for null', () => {
      expect(formatScheduleDate(null)).toBe('—')
    })

    it('returns "—" for undefined', () => {
      expect(formatScheduleDate(undefined)).toBe('—')
    })
  })

  describe('relative label — past', () => {
    it('returns "just now" when date equals now', () => {
      expect(formatScheduleDate(mins(0))).toContain('just now')
    })

    it('returns "X min ago" for 30 minutes in the past', () => {
      expect(formatScheduleDate(mins(-30))).toContain('30 min ago')
    })

    it('returns "X min ago" at 59 minutes — just before the hours boundary', () => {
      expect(formatScheduleDate(mins(-59))).toContain('59 min ago')
    })

    it('returns "Xh ago" at exactly 60 minutes — hours boundary', () => {
      expect(formatScheduleDate(mins(-1 * 60))).toContain('1h ago')
    })

    it('returns "Xh ago" for 2 hours in the past', () => {
      expect(formatScheduleDate(mins(-2 * 60))).toContain('2h ago')
    })

    it('returns "Xh ago" at 47 hours — last whole value below 48h boundary', () => {
      expect(formatScheduleDate(mins(-47 * 60))).toContain('47h ago')
    })

    it('returns "X days ago" at exactly 48 hours — crosses into days branch', () => {
      expect(formatScheduleDate(mins(-48 * 60))).toContain('2 days ago')
    })

    it('returns "X days ago" for 5 days in the past', () => {
      expect(formatScheduleDate(mins(-5 * 24 * 60))).toContain('5 days ago')
    })
  })

  describe('relative label — future', () => {
    it('returns "in X min" for 30 minutes ahead', () => {
      expect(formatScheduleDate(mins(30))).toContain('in 30 min')
    })

    it('returns "in X min" at 59 minutes — just before the hours boundary', () => {
      expect(formatScheduleDate(mins(59))).toContain('in 59 min')
    })

    it('returns "in 1 hour" for exactly 60 minutes ahead', () => {
      expect(formatScheduleDate(mins(1 * 60))).toContain('in 1 hour')
    })

    it('returns "in X hours" for 6 hours ahead', () => {
      expect(formatScheduleDate(mins(6 * 60))).toContain('in 6 hours')
    })

    it('returns "in X hours" at 47 hours — last whole value below 48h boundary', () => {
      expect(formatScheduleDate(mins(47 * 60))).toContain('in 47 hours')
    })

    it('returns "in X days" at exactly 48 hours — crosses into days branch', () => {
      expect(formatScheduleDate(mins(48 * 60))).toContain('in 2 days')
    })

    it('returns "in X days" at 48 hours + 3 minutes', () => {
      expect(formatScheduleDate(mins(48 * 60 + 3))).toContain('in 2 days')
    })

    it('returns "in X days" for 3 days ahead', () => {
      expect(formatScheduleDate(mins(3 * 24 * 60))).toContain('in 3 days')
    })
  })

  describe('date format', () => {
    it('formats date as "MMM dd, HH:mm"', () => {
      // 2 hours before FIXED_NOW = 08:30 on May 26
      const result = formatScheduleDate(mins(-120))
      expect(result).toMatch(/^May 26, 08:30/)
    })

    it('wraps relative label in parentheses', () => {
      const result = formatScheduleDate(mins(-120))
      expect(result).toMatch(/\(.+\)$/)
    })
  })
})
