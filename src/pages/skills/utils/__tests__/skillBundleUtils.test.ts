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

import {
  buildBundleWarning,
  formatFileSize,
  formatSeedLimitSize,
  getBundleTotals,
  normalizeBundleFolderPath,
  planBundleSeed,
} from '../skillBundleUtils'

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

  describe('bundle seed warning (mirrors backend)', () => {
    const MB = 1024 * 1024
    const limits = { maxCount: 100, maxFileSize: 10 * MB, maxTotalSize: 50 * MB }

    describe('formatSeedLimitSize', () => {
      it.each([
        [10 * MB, '10 MB'],
        [1.5 * MB, '1.5 MB'],
        [1536, '1.5 KB'],
        [15, '15 bytes'],
        [1, '1 byte'],
      ])('formats %s as %s', (bytes, expected) => {
        expect(formatSeedLimitSize(bytes)).toBe(expected)
      })
    })

    describe('planBundleSeed', () => {
      it('skips nothing when under all limits', () => {
        expect(planBundleSeed([makeFile('a.md', 10)], limits)).toEqual([])
      })

      it('skips a file over the per-file limit', () => {
        expect(planBundleSeed([makeFile('a.bin', 11 * MB)], limits)).toEqual([
          { path: 'a.bin', reason: 'too_large' },
        ])
      })

      it('does not count a too-large file toward the total', () => {
        const files = [
          makeFile('a.bin', 11 * MB),
          ...['b', 'c', 'd', 'e'].map((n) => makeFile(`${n}.bin`, 9 * MB)),
        ]
        expect(planBundleSeed(files, limits)).toEqual([{ path: 'a.bin', reason: 'too_large' }])
      })

      it('skips files past the count limit in path order', () => {
        const files = Array.from({ length: 102 }, (_, i) =>
          makeFile(`f${String(i).padStart(3, '0')}.md`, 1)
        )
        expect(planBundleSeed(files, limits)).toEqual([
          { path: 'f100.md', reason: 'count_exceeded' },
          { path: 'f101.md', reason: 'count_exceeded' },
        ])
      })

      it('skips files that would push the total over the limit', () => {
        const files = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => makeFile(`${n}.bin`, 9 * MB))
        expect(planBundleSeed(files, limits)).toEqual([{ path: 'f.bin', reason: 'total_exceeded' }])
      })

      it('orders by plain code-unit comparison, not locale', () => {
        const small = { maxCount: 1, maxFileSize: MB, maxTotalSize: MB }
        expect(planBundleSeed([makeFile('b.md', 1), makeFile('B.md', 1)], small)).toEqual([
          { path: 'b.md', reason: 'count_exceeded' },
        ])
      })

      it('treats a missing size as 0', () => {
        expect(planBundleSeed([makeFile('a.md')], limits)).toEqual([])
      })
    })

    describe('buildBundleWarning', () => {
      const tail = 'These files will not be available in an assistant workspace.'

      it('returns null when nothing is skipped', () => {
        expect(buildBundleWarning([makeFile('a.md', 10)], limits)).toBeNull()
      })

      it('warns about the per-file limit with the path', () => {
        expect(buildBundleWarning([makeFile('a.bin', 11 * MB)], limits)).toBe(
          `1 file(s) exceed the 10 MB per-file limit (a.bin). ${tail}`
        )
      })

      it('warns about the count limit', () => {
        const files = Array.from({ length: 101 }, (_, i) =>
          makeFile(`f${String(i).padStart(3, '0')}.md`, 1)
        )
        expect(buildBundleWarning(files, limits)).toBe(
          `1 file(s) exceed the 100-file limit (f100.md). ${tail}`
        )
      })

      it('warns about the total limit', () => {
        const files = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => makeFile(`${n}.bin`, 9 * MB))
        expect(buildBundleWarning(files, limits)).toBe(
          `1 file(s) exceed the 50 MB total size limit (f.bin). ${tail}`
        )
      })

      it('lists at most 5 paths and counts the rest', () => {
        const files = Array.from({ length: 7 }, (_, i) => makeFile(`big${i}.bin`, 11 * MB))
        expect(buildBundleWarning(files, limits)).toBe(
          `7 file(s) exceed the 10 MB per-file limit (big0.bin, big1.bin, big2.bin, big3.bin, big4.bin, ... and 2 more). ${tail}`
        )
      })

      it('joins sentences in per-file, count, total order', () => {
        const small = { maxCount: 1, maxFileSize: 5 * MB, maxTotalSize: 6 * MB }
        const files = [makeFile('a.md', 4 * MB), makeFile('b.md', 1), makeFile('c.bin', 6 * MB)]
        expect(buildBundleWarning(files, small)).toBe(
          `1 file(s) exceed the 5 MB per-file limit (c.bin). 1 file(s) exceed the 1-file limit (b.md). ${tail}`
        )
      })
    })
  })
})
