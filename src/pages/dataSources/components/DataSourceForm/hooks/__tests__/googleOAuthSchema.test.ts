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
import * as Yup from 'yup'

import { INDEX_TYPES } from '@/constants/dataSources'

// Isolated schema fragment — mirrors the setting_id rule in useEditPopupForm.ts
const googleIntegrationSchema = Yup.object({
  indexType: Yup.string().required(),
  setting_id: Yup.string().when('indexType', {
    is: (indexType: string) => indexType === INDEX_TYPES.GOOGLE,
    then: (schema) => schema.required('Integration is required for this data source type'),
    otherwise: (schema) => schema.notRequired(),
  }),
})

describe('Google datasource setting_id schema validation', () => {
  it('blocks submit when indexType is google and setting_id is empty', async () => {
    await expect(
      googleIntegrationSchema.validate({ indexType: INDEX_TYPES.GOOGLE, setting_id: '' })
    ).rejects.toThrow('Integration is required for this data source type')
  })

  it('blocks submit when indexType is google and setting_id is undefined', async () => {
    await expect(
      googleIntegrationSchema.validate({ indexType: INDEX_TYPES.GOOGLE, setting_id: undefined })
    ).rejects.toThrow('Integration is required for this data source type')
  })

  it('allows submit when indexType is google and setting_id is provided', async () => {
    await expect(
      googleIntegrationSchema.validate({
        indexType: INDEX_TYPES.GOOGLE,
        setting_id: 'abc-123-uuid',
      })
    ).resolves.toBeDefined()
  })

  it('does not require setting_id for non-Google index types', async () => {
    await expect(
      googleIntegrationSchema.validate({ indexType: 'git', setting_id: '' })
    ).resolves.toBeDefined()
  })
})
