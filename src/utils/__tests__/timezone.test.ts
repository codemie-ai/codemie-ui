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

import { getIANATimezoneOptions, getBrowserTimezone, formatTimezoneLabel } from '../timezone'

describe('formatTimezoneLabel', () => {
  it('appends UTC+0 for UTC', () => {
    expect(formatTimezoneLabel('UTC')).toBe('UTC (UTC+0)')
  })

  it('replaces underscores with spaces in the name part', () => {
    const label = formatTimezoneLabel('America/New_York')
    expect(label).toMatch(/^America\/New York /)
  })

  it('label matches UTC offset pattern', () => {
    const label = formatTimezoneLabel('Europe/Warsaw')
    expect(label).toMatch(/^Europe\/Warsaw \(UTC[+-]\d+(:\d{2})?\)$/)
  })

  it('formats sub-hour offset with minutes (Asia/Kolkata = UTC+5:30)', () => {
    const label = formatTimezoneLabel('Asia/Kolkata')
    expect(label).toMatch(/^Asia\/Kolkata \(UTC\+5:30\)$/)
  })

  it('formats sub-hour offset with minutes (Asia/Kathmandu = UTC+5:45)', () => {
    const label = formatTimezoneLabel('Asia/Kathmandu')
    expect(label).toMatch(/^Asia\/Kathmandu \(UTC\+5:45\)$/)
  })

  it('returns name-only for an unrecognized timezone string (no NaN in output)', () => {
    const label = formatTimezoneLabel('Not/A_Real_Zone')
    expect(label).toBe('Not/A Real Zone')
    expect(label).not.toContain('NaN')
  })
})

describe('getIANATimezoneOptions', () => {
  it('returns a non-empty array', () => {
    const options = getIANATimezoneOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })

  it('each option label has UTC offset suffix', () => {
    const options = getIANATimezoneOptions()
    options.forEach((opt) => {
      expect(opt.label).toMatch(/\(UTC[+-]\d+(:\d{2})?\)$/)
    })
  })

  it('each option label has no underscores in the name part', () => {
    const options = getIANATimezoneOptions()
    options.forEach((opt) => {
      const namePart = opt.label.replace(/ \(UTC[+-]\d+(:\d{2})?\)$/, '')
      expect(namePart).not.toContain('_')
    })
  })

  it('value is still the raw IANA string (not modified)', () => {
    const options = getIANATimezoneOptions()
    options.forEach((opt) => {
      expect(typeof opt.value).toBe('string')
      expect(opt.label).not.toBe(opt.value)
    })
  })

  it('UTC entry label is "UTC (UTC+0)"', () => {
    const options = getIANATimezoneOptions()
    const utcOption = options.find((o) => o.value === 'UTC')
    expect(utcOption).toBeDefined()
    expect(utcOption!.label).toBe('UTC (UTC+0)')
  })

  it('always includes UTC value', () => {
    const values = getIANATimezoneOptions().map((o) => o.value)
    expect(values).toContain('UTC')
  })

  it('returns the same reference on repeated calls (cached)', () => {
    expect(getIANATimezoneOptions()).toBe(getIANATimezoneOptions())
  })
})

describe('getBrowserTimezone', () => {
  it('returns a non-empty string', () => {
    const tz = getBrowserTimezone()
    expect(typeof tz).toBe('string')
    expect(tz.length).toBeGreaterThan(0)
  })
})
