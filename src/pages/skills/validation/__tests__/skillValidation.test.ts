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
import * as Yup from 'yup'

import { createSkillValidationSchema } from '@/pages/skills/validation/skillValidation'

describe('createSkillValidationSchema', () => {
  it('rejects content exceeding the provided maxContentLength', async () => {
    const schema = createSkillValidationSchema(50000)
    const content = schema.fields.content as Yup.StringSchema
    const isValid = await content.isValid('x'.repeat(50001))
    expect(isValid).toBe(false)
  })

  it('includes the maxContentLength value in the error message', async () => {
    const schema = createSkillValidationSchema(50000)
    const content = schema.fields.content as Yup.StringSchema
    try {
      await content.validate('x'.repeat(50001))
      expect.fail('Expected validation to throw')
    } catch (err: any) {
      expect(err.message).toContain('50000')
    }
  })

  it('accepts content at exactly maxContentLength', async () => {
    const schema = createSkillValidationSchema(50000)
    const content = schema.fields.content as Yup.StringSchema
    const isValid = await content.isValid('x'.repeat(50000))
    expect(isValid).toBe(true)
  })

  it('uses the provided maxContentLength, not the hardcoded constant', async () => {
    const schema = createSkillValidationSchema(45000)
    const content = schema.fields.content as Yup.StringSchema
    const isValid = await content.isValid('x'.repeat(45001))
    expect(isValid).toBe(false)
  })
})
