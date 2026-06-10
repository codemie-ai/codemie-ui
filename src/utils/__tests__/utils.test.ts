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

import { sanitizeHtmlId } from '@/utils/utils'

describe('sanitizeHtmlId', () => {
  it('should convert spaces to hyphens', () => {
    expect(sanitizeHtmlId('Fetch MCP Server')).toBe('fetch-mcp-server')
  })

  it('should remove question marks and convert to hyphens', () => {
    expect(sanitizeHtmlId('Fetch ? MCP Server')).toBe('fetch-mcp-server')
  })

  it('should handle EPAM Matching case from bug report', () => {
    expect(sanitizeHtmlId('EPAM Matching ? Relevance score')).toBe('epam-matching-relevance-score')
  })

  it('should convert to lowercase', () => {
    expect(sanitizeHtmlId('UPPERCASE')).toBe('uppercase')
  })

  it('should collapse consecutive hyphens', () => {
    expect(sanitizeHtmlId('multiple   spaces')).toBe('multiple-spaces')
  })

  it('should trim leading and trailing hyphens', () => {
    expect(sanitizeHtmlId('?leading and trailing?')).toBe('leading-and-trailing')
  })

  it('should handle simple names', () => {
    expect(sanitizeHtmlId('simple-name')).toBe('simple-name')
  })

  it('should handle names with numbers', () => {
    expect(sanitizeHtmlId('Tool 123')).toBe('tool-123')
  })

  it('should remove all invalid characters', () => {
    expect(sanitizeHtmlId('a@b#c$d%e')).toBe('a-b-c-d-e')
  })

  it('should handle empty string', () => {
    expect(sanitizeHtmlId('')).toBe('')
  })
})
