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

import { INDEX_TYPES } from '@/constants/dataSources'

import { editingSchema } from '../useEditPopupForm'

const baseValidObject = {
  indexType: INDEX_TYPES.FILE,
  projectName: 'test-project',
  description: 'test description',
  projectSpaceVisible: true,
  isEditing: true,
  uploadedFiles: [],
  files: [],
  guardrail_assignments: [],
}

describe('editingSchema — uploadedFiles validation', () => {
  it('passes when 1 uploadedFile + 0 new files (FILE type)', async () => {
    const values = {
      ...baseValidObject,
      uploadedFiles: ['a.pdf'],
      files: [],
    }
    await expect(editingSchema.validate(values, { abortEarly: false })).resolves.toBeTruthy()
  })

  it('passes when 0 uploadedFiles + 1 new file (FILE type)', async () => {
    const values = {
      ...baseValidObject,
      uploadedFiles: [],
      files: [new File(['content'], 'b.csv')],
    }
    await expect(editingSchema.validate(values, { abortEarly: false })).resolves.toBeTruthy()
  })

  it('passes when 1 uploadedFile + 1 new file (FILE type)', async () => {
    const values = {
      ...baseValidObject,
      uploadedFiles: ['a.pdf'],
      files: [new File(['content'], 'b.csv')],
    }
    await expect(editingSchema.validate(values, { abortEarly: false })).resolves.toBeTruthy()
  })

  it('fails when 0 uploadedFiles + 0 new files (FILE type)', async () => {
    const values = {
      ...baseValidObject,
      uploadedFiles: [],
      files: [],
    }
    await expect(editingSchema.validate(values, { abortEarly: false })).rejects.toThrow(
      'At least one file is required'
    )
  })

  it('does not fire for non-FILE index types', async () => {
    const values = {
      ...baseValidObject,
      indexType: INDEX_TYPES.BEDROCK,
      uploadedFiles: [],
      files: [],
    }
    await expect(editingSchema.validate(values, { abortEarly: false })).resolves.toBeTruthy()
  })
})
