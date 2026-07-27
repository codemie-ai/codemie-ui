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

import { getIANATimezoneOptions, getBrowserTimezone } from '../timezone'

describe('getIANATimezoneOptions', () => {
  it('returns a non-empty array', () => {
    const options = getIANATimezoneOptions()
    expect(Array.isArray(options)).toBe(true)
    expect(options.length).toBeGreaterThan(0)
  })

  it('each option has a string label with underscores replaced by spaces', () => {
    const options = getIANATimezoneOptions()
    options.forEach((opt) => {
      expect(typeof opt.label).toBe('string')
      expect(opt.label).toBe((opt.value as string).replace(/_/g, ' '))
      expect(opt.label).not.toContain('_')
    })
  })

  it('includes well-known IANA timezones with readable labels', () => {
    const options = getIANATimezoneOptions()
    const byValue = Object.fromEntries(options.map((o) => [o.value, o.label]))
    expect(byValue['America/New_York']).toBe('America/New York')
    expect(byValue['Europe/London']).toBe('Europe/London')
    expect(byValue['Asia/Tokyo']).toBe('Asia/Tokyo')
  })

  it('always includes UTC so legacy integrations with timezone="UTC" display correctly', () => {
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
