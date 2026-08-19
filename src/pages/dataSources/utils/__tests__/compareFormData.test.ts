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

import { compareFormData } from '../compareFormData'

const base = {
  name: '',
  embeddingsModel: '',
  summarizationModel: '',
  projectName: '',
  setting_id: '',
  indexType: 'google-docs',
  description: '',
  indexMetadata: { version: 1 },
}

describe('compareFormData', () => {
  describe('name normalization (regression: EPMCDME-14129)', () => {
    it('returns false when initial name is empty and current name is auto-generated (skipNameCheck: true)', () => {
      expect(
        compareFormData(
          { ...base, name: '' },
          { ...base, name: 'google-docs-2026-08-18_10-30' },
          { skipNameCheck: true }
        )
      ).toBe(false)
    })

    it('returns true when initial name is empty and user typed a name (skipNameCheck: false)', () => {
      expect(compareFormData({ ...base, name: '' }, { ...base, name: 'user-typed-name' })).toBe(
        true
      )
    })

    it('returns true when initial name is non-empty and current name differs', () => {
      expect(
        compareFormData({ ...base, name: 'my-source' }, { ...base, name: 'changed-name' })
      ).toBe(true)
    })

    it('returns false when name is unchanged', () => {
      expect(compareFormData({ ...base, name: 'my-source' }, { ...base, name: 'my-source' })).toBe(
        false
      )
    })
  })

  describe('existing normalizations', () => {
    it('returns false when initial embeddingsModel is empty and current has a value', () => {
      expect(compareFormData({ ...base }, { ...base, embeddingsModel: 'gpt-4o' })).toBe(false)
    })

    it('returns true when initial embeddingsModel is non-empty and current differs', () => {
      expect(
        compareFormData(
          { ...base, embeddingsModel: 'gpt-3.5' },
          { ...base, embeddingsModel: 'gpt-4o' }
        )
      ).toBe(true)
    })

    it('returns false when initial summarizationModel is empty and current has a value', () => {
      expect(compareFormData({ ...base }, { ...base, summarizationModel: 'claude-3' })).toBe(false)
    })

    it('returns false when initial projectName is empty and current has a value', () => {
      expect(compareFormData({ ...base }, { ...base, projectName: 'my-project' })).toBe(false)
    })

    it('returns false when initial setting_id is empty and current has a value', () => {
      expect(compareFormData({ ...base }, { ...base, setting_id: 's-42' })).toBe(false)
    })

    it('ignores indexMetadata differences', () => {
      expect(
        compareFormData({ ...base, indexMetadata: { a: 1 } }, { ...base, indexMetadata: { b: 2 } })
      ).toBe(false)
    })
  })

  describe('guard clauses', () => {
    it('returns false when initial is null', () => {
      expect(compareFormData(null, base)).toBe(false)
    })

    it('returns false when current is null', () => {
      expect(compareFormData(base, null)).toBe(false)
    })

    it('returns false when both objects are identical', () => {
      const values = { ...base, name: 'my-source', embeddingsModel: 'gpt-4o' }
      expect(compareFormData(values, { ...values })).toBe(false)
    })

    it('returns true when a non-normalised field changes', () => {
      expect(
        compareFormData({ ...base, description: 'original' }, { ...base, description: 'changed' })
      ).toBe(true)
    })
  })
})
