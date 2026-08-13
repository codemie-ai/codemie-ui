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

import { sanitizeMessage as sanitize, unSanitizeMessage as unSanitize } from '@/utils/htmlEscape'

describe('sanitizeMessage', () => {
  it('escapes raw < and >', () => {
    expect(sanitize('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes only angle brackets — & is passed through for marked to encode', () => {
    expect(sanitize('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('does not double-encode &lt; — stores as &#60;', () => {
    expect(sanitize('&lt;')).toBe('&#60;')
  })

  it('does not double-encode &gt; — stores as &#62;', () => {
    expect(sanitize('&gt;')).toBe('&#62;')
  })

  it('passes & through unchanged so marked can encode it correctly', () => {
    expect(sanitize('a & b')).toBe('a & b')
  })

  it('preserves <br> tags intact', () => {
    expect(sanitize('line1<br>line2')).toBe('line1<br>line2')
  })

  it('handles entity-injection attempt: &lt;script&gt; stored as &#60;script&#62;', () => {
    const result = sanitize('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('&lt;script')
    expect(result).toBe('&#60;script&#62;alert(1)&#60;/script&#62;')
  })

  it('treats the old static placeholder strings as plain text, not as protected markers', () => {
    // Before the per-call token fix, an LLM output containing ___BR_PLACEHOLDER___,
    // ___LT___, or ___GT___ would be rewritten into <br>/&#60;/&#62; by mistake.
    expect(sanitize('___BR_PLACEHOLDER___')).toBe('___BR_PLACEHOLDER___')
    expect(sanitize('___LT___')).toBe('___LT___')
    expect(sanitize('___GT___')).toBe('___GT___')
  })
})

describe('unSanitizeMessage', () => {
  it('restores &lt; → <', () => {
    expect(unSanitize('&lt;')).toBe('<')
  })

  it('restores &gt; → >', () => {
    expect(unSanitize('&gt;')).toBe('>')
  })

  it('restores numeric ref &#60; → &lt;', () => {
    expect(unSanitize('&#60;')).toBe('&lt;')
  })

  it('restores numeric ref &#62; → &gt;', () => {
    expect(unSanitize('&#62;')).toBe('&gt;')
  })

  it('is a left-inverse of sanitize for raw text with < and >', () => {
    const raw = 'x < y && z > w'
    expect(unSanitize(sanitize(raw))).toBe(raw)
  })

  it('round-trips code containing an &lt; entity', () => {
    const raw = 'if (x &lt; y)'
    expect(unSanitize(sanitize(raw))).toBe(raw)
  })
})
