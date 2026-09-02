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

import { describe, expect, it } from 'vitest'

import { agentUrlHost, sanitizeAgentUrl } from '@/a2ui/utils'

describe('sanitizeAgentUrl', () => {
  it('accepts absolute http URLs', () => {
    expect(sanitizeAgentUrl('http://example.com/image.png')).toBe('http://example.com/image.png')
  })

  it('accepts absolute https URLs', () => {
    expect(sanitizeAgentUrl('https://example.com/a.mp4?x=1')).toBe('https://example.com/a.mp4?x=1')
  })

  it('trims surrounding whitespace before validating', () => {
    expect(sanitizeAgentUrl('  https://example.com/a.png  ')).toBe('https://example.com/a.png')
  })

  it('rejects javascript: URLs', () => {
    // eslint-disable-next-line no-script-url -- the hostile URL under test
    expect(sanitizeAgentUrl('javascript:alert(1)')).toBeNull()
  })

  it('rejects javascript: URLs regardless of case', () => {
    // eslint-disable-next-line no-script-url -- the hostile URL under test
    expect(sanitizeAgentUrl('JaVaScRiPt:alert(1)')).toBeNull()
  })

  it('rejects data: URLs', () => {
    expect(sanitizeAgentUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('rejects vbscript: URLs', () => {
    expect(sanitizeAgentUrl('vbscript:msgbox(1)')).toBeNull()
  })

  it('rejects relative URLs', () => {
    expect(sanitizeAgentUrl('/local/path.png')).toBeNull()
    expect(sanitizeAgentUrl('image.png')).toBeNull()
  })

  it('rejects protocol-relative URLs', () => {
    expect(sanitizeAgentUrl('//example.com/a.png')).toBeNull()
  })

  it('rejects non-string and empty values', () => {
    expect(sanitizeAgentUrl(undefined)).toBeNull()
    expect(sanitizeAgentUrl(null)).toBeNull()
    expect(sanitizeAgentUrl(42)).toBeNull()
    expect(sanitizeAgentUrl({ path: '/x' })).toBeNull()
    expect(sanitizeAgentUrl('')).toBeNull()
    expect(sanitizeAgentUrl('   ')).toBeNull()
  })
})

describe('agentUrlHost', () => {
  it('returns the host a media element would talk to', () => {
    expect(agentUrlHost('https://cdn.example.com/a.png?secret=1')).toBe('cdn.example.com')
  })

  it('keeps a non-default port visible', () => {
    expect(agentUrlHost('http://example.com:8080/a.png')).toBe('example.com:8080')
  })

  it('returns an empty string for values that are not parsable URLs', () => {
    expect(agentUrlHost('not a url')).toBe('')
  })
})
