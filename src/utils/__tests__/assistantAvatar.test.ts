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

import { getAssistantInitials } from '@/utils/assistantAvatar'

describe('getAssistantInitials', () => {
  describe('empty / blank input', () => {
    it('returns "?" for empty string', () => {
      expect(getAssistantInitials('')).toBe('?')
    })

    it('returns "?" for whitespace-only string', () => {
      expect(getAssistantInitials('   ')).toBe('?')
    })

    it('returns "?" for tab-only string', () => {
      expect(getAssistantInitials('\t\t')).toBe('?')
    })

    it('returns "?" for newline-only string', () => {
      expect(getAssistantInitials('\n\n')).toBe('?')
    })
  })

  describe('single-word names', () => {
    it('returns first two chars uppercased for a normal word', () => {
      expect(getAssistantInitials('Alice')).toBe('AL')
    })

    it('returns single char uppercased for a one-char name', () => {
      expect(getAssistantInitials('A')).toBe('A')
    })

    it('returns two chars for a two-char name', () => {
      expect(getAssistantInitials('Jo')).toBe('JO')
    })

    it('uppercases lowercase letters', () => {
      expect(getAssistantInitials('hello')).toBe('HE')
    })

    it('strips leading special chars and takes first two alphanum', () => {
      expect(getAssistantInitials('!Hello')).toBe('HE')
    })

    it('strips all non-alphanumeric chars and uses first two remaining', () => {
      expect(getAssistantInitials('!@#abc')).toBe('AB')
    })

    it('returns "?" when single word has no alphanumeric characters', () => {
      expect(getAssistantInitials('!!!')).toBe('?')
    })

    it('returns "?" when single word is all emojis', () => {
      expect(getAssistantInitials('😀🎉')).toBe('?')
    })

    it('returns "?" when single word is all unicode non-ASCII letters', () => {
      expect(getAssistantInitials('张三')).toBe('?')
    })

    it('treats digits as alphanumeric', () => {
      expect(getAssistantInitials('123abc')).toBe('12')
    })

    it('handles digit-only word', () => {
      expect(getAssistantInitials('007')).toBe('00')
    })

    it('trims surrounding whitespace before processing', () => {
      expect(getAssistantInitials('  Alice  ')).toBe('AL')
    })

    it('uses only first two alphanum chars from a long word', () => {
      expect(getAssistantInitials('Supercalifragilistic')).toBe('SU')
    })

    it('strips accented/extended latin chars', () => {
      expect(getAssistantInitials('ÄÖÜabc')).toBe('AB')
    })

    it('treats a hyphenated compound as a single word', () => {
      expect(getAssistantInitials('Mary-Jane')).toBe('MA')
    })

    it('treats underscored name as a single word', () => {
      expect(getAssistantInitials('test_bot')).toBe('TE')
    })

    it('handles a single alphanumeric char surrounded by specials', () => {
      expect(getAssistantInitials('!!A!!')).toBe('A')
    })
  })

  describe('multi-word names', () => {
    it('returns first letter of first and last word for two words', () => {
      expect(getAssistantInitials('John Doe')).toBe('JD')
    })

    it('uses first and last word only for three-word name', () => {
      expect(getAssistantInitials('John Michael Doe')).toBe('JD')
    })

    it('uses first and last word only for four-word name', () => {
      expect(getAssistantInitials('Anna Maria Van Den')).toBe('AD')
    })

    it('uppercases multi-word initials', () => {
      expect(getAssistantInitials('alice wonderland')).toBe('AW')
    })

    it('skips leading special chars in each word to find first alphanum', () => {
      expect(getAssistantInitials('!Alice ?Wonderland')).toBe('AW')
    })

    it('handles first word starting with digit', () => {
      expect(getAssistantInitials('1st Assistant')).toBe('1A')
    })

    it('handles last word starting with digit', () => {
      expect(getAssistantInitials('Agent 007')).toBe('A0')
    })

    it('returns "?" when both words have no alphanumeric chars', () => {
      expect(getAssistantInitials('!!! ???')).toBe('?')
    })

    it('returns only last initial when first word has no alphanum', () => {
      expect(getAssistantInitials('😀 Alice')).toBe('A')
    })

    it('returns only first initial when last word has no alphanum', () => {
      expect(getAssistantInitials('Alice 😀')).toBe('A')
    })

    it('handles multiple spaces between words', () => {
      expect(getAssistantInitials('John   Doe')).toBe('JD')
    })

    it('handles tab-separated words', () => {
      expect(getAssistantInitials('John\tDoe')).toBe('JD')
    })

    it('handles mixed-case words', () => {
      expect(getAssistantInitials('JOHN DOE')).toBe('JD')
    })

    it('treats hyphenated last name as one last word token', () => {
      expect(getAssistantInitials('Mary Smith-Jones')).toBe('MS')
    })

    it('handles mixed unicode and ASCII — uses ASCII alphanum only', () => {
      expect(getAssistantInitials('张三 Li')).toBe('L')
    })
  })
})
