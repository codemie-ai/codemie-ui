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

import {
  isDuplicateConnectionItem,
  isConnectionHeaderSettingSelected,
  isConnectionSettingSelected,
  GUARDRAIL_DUPLICATE_TEST_TYPE,
} from './guardrailAssignmentSchemaUtils'

const headerGuardrailSettingsSchema = Yup.object({
  mode: Yup.string()
    .oneOf(['', ...Object.values(GuardrailMode)])
    .defined()
    .test('is-header-setting-selected', isConnectionHeaderSettingSelected),
  source: Yup.string()
    .oneOf(['', ...Object.values(GuardrailSource)])
    .defined()
    .test('is-header-setting-selected', isConnectionHeaderSettingSelected),
})

const itemGuardrailSettingsSchema = Yup.object({
  mode: Yup.string()
    .oneOf(['', ...Object.values(GuardrailMode)])
    .defined()
    .test('is-selected', isConnectionSettingSelected),
  source: Yup.string()
    .oneOf(['', ...Object.values(GuardrailSource)])
    .defined()
    .test('is-selected', isConnectionSettingSelected),
})

const entityAssignmentItemSchema = Yup.object({
  settings: itemGuardrailSettingsSchema.required(),
  id: Yup.string().test('is-selected', isConnectionSettingSelected),
  name: Yup.string().optional(),
  icon_url: Yup.string().nullable().optional(),
  index_type: Yup.string().optional(),
}).test(GUARDRAIL_DUPLICATE_TEST_TYPE, isDuplicateConnectionItem)

const entityAssignmentConfigSchema = Yup.object({
  settings: Yup.array().of(headerGuardrailSettingsSchema).optional(),
  items: Yup.array().of(entityAssignmentItemSchema).optional(),
})

export const guardrailAssignmentformSchema = Yup.object({
  assistants: entityAssignmentConfigSchema.optional(),
  datasources: entityAssignmentConfigSchema.optional(),
  workflows: entityAssignmentConfigSchema.optional(),
  project: Yup.object({
    settings: Yup.array().of(headerGuardrailSettingsSchema).required(),
  }).optional(),
})

export enum GuardrailAssignmentFormKeys {
  assistants = 'assistants',
  workflows = 'workflows',
  datasources = 'datasources',
  project = 'project',
}

export type GuardrailAssignmentFormValues = Yup.InferType<typeof guardrailAssignmentformSchema>
export type EntityAssignmentFormItem = Yup.InferType<typeof entityAssignmentItemSchema>
