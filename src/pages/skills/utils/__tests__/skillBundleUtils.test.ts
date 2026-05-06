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

import { normalizeBundleFolderPath } from '../skillBundleUtils'

describe('skillBundleUtils', () => {
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
