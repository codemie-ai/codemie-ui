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

import { MAX_SKILL_BUNDLE_FILE_COUNT, MAX_SKILL_BUNDLE_SIZE_BYTES } from '@/constants/skills'
import { SkillCompanionFile } from '@/types/entity/skill'

import { formatFileSize, getBundleTotals, normalizeBundleFolderPath } from '../skillBundleUtils'

const makeFile = (path: string, size_bytes?: number): SkillCompanionFile => ({
  path,
  content: '',
  encoding: 'text',
  size_bytes,
})

describe('skillBundleUtils', () => {
  describe('getBundleTotals', () => {
    it('returns zero totals for an empty bundle', () => {
      expect(getBundleTotals([])).toEqual({ totalSizeBytes: 0, fileCount: 0 })
    })

    it('sums size_bytes across files and counts files', () => {
      const files = [makeFile('a.md', 1000), makeFile('b.md', 2000)]
      expect(getBundleTotals(files)).toEqual({ totalSizeBytes: 3000, fileCount: 2 })
    })

    it('treats a missing size_bytes as 0', () => {
      const files = [makeFile('a.md', 1000), makeFile('b.md', undefined)]
      expect(getBundleTotals(files)).toEqual({ totalSizeBytes: 1000, fileCount: 2 })
    })

    it('stays under both ceilings', () => {
      const files = [makeFile('a.md', 1000), makeFile('b.md', 2000)]
      const totals = getBundleTotals(files)
      expect(totals.totalSizeBytes).toBeLessThanOrEqual(MAX_SKILL_BUNDLE_SIZE_BYTES)
      expect(totals.fileCount).toBeLessThanOrEqual(MAX_SKILL_BUNDLE_FILE_COUNT)
    })

    it('exceeds the size ceiling only', () => {
      const files = [makeFile('a.md', MAX_SKILL_BUNDLE_SIZE_BYTES + 1)]
      const totals = getBundleTotals(files)
      expect(totals.totalSizeBytes).toBeGreaterThan(MAX_SKILL_BUNDLE_SIZE_BYTES)
      expect(totals.fileCount).toBeLessThanOrEqual(MAX_SKILL_BUNDLE_FILE_COUNT)
    })

    it('exceeds the file-count ceiling only', () => {
      const files = Array.from({ length: MAX_SKILL_BUNDLE_FILE_COUNT + 1 }, (_, i) =>
        makeFile(`f${i}.md`, 10)
      )
      const totals = getBundleTotals(files)
      expect(totals.totalSizeBytes).toBeLessThanOrEqual(MAX_SKILL_BUNDLE_SIZE_BYTES)
      expect(totals.fileCount).toBeGreaterThan(MAX_SKILL_BUNDLE_FILE_COUNT)
    })

    it('exceeds both ceilings', () => {
      const files = Array.from({ length: MAX_SKILL_BUNDLE_FILE_COUNT + 1 }, (_, i) =>
        makeFile(`f${i}.md`, MAX_SKILL_BUNDLE_SIZE_BYTES)
      )
      const totals = getBundleTotals(files)
      expect(totals.totalSizeBytes).toBeGreaterThan(MAX_SKILL_BUNDLE_SIZE_BYTES)
      expect(totals.fileCount).toBeGreaterThan(MAX_SKILL_BUNDLE_FILE_COUNT)
    })
  })

  describe('formatFileSize', () => {
    it('returns "Unknown size" when sizeBytes is undefined', () => {
      expect(formatFileSize(undefined)).toBe('Unknown size')
    })

    it('formats bytes under 1024 as B', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('formats sizes under 1MB as KB', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB')
    })

    it('formats sizes at or above 1MB as MB', () => {
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10.0 MB')
    })
  })

  describe('normalizeBundleFolderPath', () => {
    it('normalizes relative folder paths', () => {
      expect(normalizeBundleFolderPath('  folder\\nested//child/  ')).toBe('folder/nested/child')
    })

    it('returns empty string for blank input', () => {
      expect(normalizeBundleFolderPath('   ')).toBe('')
    })

    it('rejects unix-style absolute paths', () => {
      expect(() => normalizeBundleFolderPath('/folder/nested/')).toThrow(
        'Folder path must be relative'
      )
    })

    it('rejects windows-style absolute paths', () => {
      expect(() => normalizeBundleFolderPath('C:\\folder\\nested')).toThrow(
        'Folder path must be relative'
      )
    })

    it('rejects dot segments', () => {
      expect(() => normalizeBundleFolderPath('folder/../nested')).toThrow(
        'Folder path cannot contain . or .. segments'
      )
    })
  })
})
