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

import {
  GuardrailAssignmentsSchema,
  guardrailAssignmentsSchema,
} from '@/components/guardrails/GuardrailAssignmentPanel/schemas/guardrailAssignmentSchema'

// Base schema for workflow fields (without yaml_config)
export const baseWorkflowSchema = Yup.object()
  .shape({
    name: Yup.string().required('Name is required'),
    project: Yup.string().nullable(),
    description: Yup.string(),
    icon_url: Yup.string()
      .url('Icon URL must be a valid URL')
      .nullable()
      .transform((value) => (value === '' ? null : value)),
    shared: Yup.boolean(),
  })
  .shape(guardrailAssignmentsSchema)

// Full schema including yaml_config
export const workflowSchema = baseWorkflowSchema.concat(
  Yup.object().shape({
    yaml_config: Yup.string().required('YAML configuration is required'),
  })
)

export interface WorkflowFormValues extends GuardrailAssignmentsSchema {
  name: string
  project?: string | null
  description?: string
  icon_url?: string | null
  shared?: boolean
}

export interface WorkflowFormValuesWithYaml extends WorkflowFormValues {
  yaml_config: string
}
