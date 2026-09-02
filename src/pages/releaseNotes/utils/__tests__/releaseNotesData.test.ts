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

import { DateTime } from 'luxon'
import { describe, it, expect } from 'vitest'

import rawData from '@/configs/releaseNotes.json'

import { SectionCode } from '../../types'

const VALID_SECTION_CODES = Object.values(SectionCode)

describe('releaseNotes.json', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(rawData)).toBe(true)
    expect(rawData.length).toBeGreaterThan(0)
  })

  it('every entry is either sectioned or legacy format (not both)', () => {
    rawData.forEach((entry) => {
      const hasIssues = 'issues' in (entry as any)
      const hasSections = 'sections' in (entry as any)
      expect(hasIssues || hasSections).toBe(true)
      expect(hasIssues && hasSections).toBe(false)
    })
  })

  it('all version strings are unique', () => {
    const versions = rawData.map((entry) => (entry as any).version)
    expect(new Set(versions).size).toBe(versions.length)
  })

  it('date field, when present, is a valid ISO date (YYYY-MM-DD)', () => {
    rawData.forEach((entry) => {
      const { date } = entry as any
      if (date !== undefined) {
        expect(typeof date).toBe('string')
        expect(DateTime.fromISO(date).isValid).toBe(true)
      }
    })
  })

  it('has no null or undefined entries', () => {
    rawData.forEach((entry) => {
      expect(entry).not.toBeNull()
      expect(entry).not.toBeUndefined()
    })
  })

  it('every entry has a non-empty version string', () => {
    rawData.forEach((entry) => {
      expect(typeof (entry as any).version).toBe('string')
      expect((entry as any).version.length).toBeGreaterThan(0)
    })
  })

  describe('sectioned entries (new format)', () => {
    const sectionedEntries = rawData.filter((entry) => 'sections' in entry)

    it('have at least one sectioned entry', () => {
      expect(sectionedEntries.length).toBeGreaterThan(0)
    })

    it('every sectioned entry has at least one section', () => {
      sectionedEntries.forEach((entry) => {
        expect((entry as any).sections.length).toBeGreaterThan(0)
      })
    })

    it('section codes within each entry are unique', () => {
      sectionedEntries.forEach((entry) => {
        const codes = (entry as any).sections.map((s: any) => s.code)
        expect(new Set(codes).size).toBe(codes.length)
      })
    })

    it('every section has a valid code from SectionCode enum', () => {
      sectionedEntries.forEach((entry) => {
        const sections = (entry as any).sections as any[]
        sections.forEach((section) => {
          expect(section.code).toBeDefined()
          expect(VALID_SECTION_CODES).toContain(section.code)
        })
      })
    })

    it('every section has an items array', () => {
      sectionedEntries.forEach((entry) => {
        const sections = (entry as any).sections as any[]
        sections.forEach((section) => {
          expect(Array.isArray(section.items)).toBe(true)
        })
      })
    })

    it('every item has a non-empty title and issues array', () => {
      sectionedEntries.forEach((entry) => {
        const sections = (entry as any).sections as any[]
        sections.forEach((section) => {
          section.items.forEach((item: any) => {
            expect(typeof item.title).toBe('string')
            expect(item.title.length).toBeGreaterThan(0)
            expect(Array.isArray(item.issues)).toBe(true)
          })
        })
      })
    })

    it('every issue has key, type, and link fields', () => {
      sectionedEntries.forEach((entry) => {
        const sections = (entry as any).sections as any[]
        sections.forEach((section) => {
          section.items.forEach((item: any) => {
            item.issues.forEach((issue: any) => {
              expect(typeof issue.key).toBe('string')
              expect(issue.key.length).toBeGreaterThan(0)
              expect(typeof issue.type).toBe('string')
              expect(issue.type.length).toBeGreaterThan(0)
              expect(typeof issue.link).toBe('string')
              expect(issue.link.length).toBeGreaterThan(0)
            })
          })
        })
      })
    })
  })

  describe('legacy entries (old format)', () => {
    const legacyEntries = rawData.filter((entry) => 'issues' in entry)

    it('every legacy entry has issues as a non-null array', () => {
      legacyEntries.forEach((entry) => {
        expect(Array.isArray((entry as any).issues)).toBe(true)
      })
    })

    it('every legacy issue has key, title, type, and link fields', () => {
      legacyEntries.forEach((entry) => {
        const issues = (entry as any).issues as any[]
        issues.forEach((issue) => {
          expect(typeof issue.key).toBe('string')
          expect(issue.key.length).toBeGreaterThan(0)
          expect(typeof issue.title).toBe('string')
          expect(issue.title.length).toBeGreaterThan(0)
          expect(typeof issue.type).toBe('string')
          expect(issue.type.length).toBeGreaterThan(0)
          expect(typeof issue.link).toBe('string')
          expect(issue.link.length).toBeGreaterThan(0)
        })
      })
    })
  })
})
