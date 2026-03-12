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

import * as Yup from 'yup'

import { GuardrailMode, GuardrailSource } from '@/types/entity/guardrail'

import { GUARDRAIL_DUPLICATE_TEST_TYPE } from '../../GuardrailAssignmentPopup/schemas/guardrailAssignmentSchemaUtils'

export const guardrailAssignmentItemSchema = Yup.object({
  guardrail_id: Yup.string()
    .required('Required field')
    .test('not-empty', 'Required field', (value) => !!value),
  guardrail_name: Yup.string(),
  mode: Yup.string()
    .oneOf(Object.values(GuardrailMode), 'Required field')
    .required('Required field')
    .test('not-empty', 'Required field', (value) => !!value),
  source: Yup.string()
    .oneOf(Object.values(GuardrailSource), 'Required field')
    .required('Required field')
    .test('not-empty', 'Required field', (value) => !!value),
  editable: Yup.boolean().default(true),
}).test(
  GUARDRAIL_DUPLICATE_TEST_TYPE,
  'Duplicate assignments detected',
  function (this: Yup.TestContext<Yup.AnyObject>, value) {
    const { path, parent } = this
    const items = parent

    // Skip duplicate check if ID is empty - let the 'is-required' error take priority
    if (!value.guardrail_id || !value.mode || !value.source) {
      return true
    }

    const duplicates = items.filter(
      (item) =>
        item.guardrail_id === value.guardrail_id &&
        item.mode === value.mode &&
        item.source === value.source
    )

    if (duplicates.length > 1) {
      return this.createError({
        path,
        message: 'Connection with these parameters already exists',
      })
    }

    return true
  }
)

export type GuardrailAssignmentItemSchema = Yup.InferType<typeof guardrailAssignmentItemSchema>

export const guardrailAssignmentsSchema = {
  guardrail_assignments: Yup.array().of(guardrailAssignmentItemSchema).required(),
}

export type GuardrailAssignmentsSchema = {
  guardrail_assignments: Array<Yup.InferType<typeof guardrailAssignmentItemSchema>>
}
