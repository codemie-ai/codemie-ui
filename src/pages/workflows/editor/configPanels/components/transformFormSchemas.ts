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
  TransformInputSource,
  TransformErrorStrategy,
  TransformMappingType,
} from '@/types/workflowEditor/configuration'

export const mappingValidationSchema = Yup.object().shape({
  output_field: Yup.string().required('Output field is required'),
  type: Yup.mixed<TransformMappingType>()
    .oneOf(Object.values(TransformMappingType))
    .required('Mapping type is required'),
  source_path: Yup.string().when('type', ([type], schema) => {
    if (type === TransformMappingType.EXTRACT || type === TransformMappingType.ARRAY_MAP) {
      return schema.required('Source path is required')
    }
    return schema.optional()
  }),
  condition: Yup.string().when('type', ([type], schema) => {
    if (type === TransformMappingType.CONDITION) {
      return schema.required('Condition expression is required')
    }
    return schema.optional()
  }),
  then_value: Yup.mixed().when('type', ([type], schema) => {
    if (type === TransformMappingType.CONDITION) {
      return schema.required('Then value is required')
    }
    return schema.optional()
  }),
  else_value: Yup.mixed().when('type', ([type], schema) => {
    if (type === TransformMappingType.CONDITION) {
      return schema.required('Else value is required')
    }
    return schema.optional()
  }),
  template: Yup.string().when('type', ([type], schema) => {
    if (type === TransformMappingType.TEMPLATE) {
      return schema.required('Template is required')
    }
    return schema.optional()
  }),
  value: Yup.mixed().when('type', ([type], schema) => {
    if (type === TransformMappingType.CONSTANT) {
      return schema.required('Value is required')
    }
    return schema.optional()
  }),
  script: Yup.string().when('type', ([type], schema) => {
    if (type === TransformMappingType.SCRIPT) {
      return schema.required('Script is required')
    }
    return schema.optional()
  }),
  item_field: Yup.string().when('type', ([type], schema) => {
    if (type === TransformMappingType.ARRAY_MAP) {
      return schema.required('Item field is required')
    }
    return schema.optional()
  }),
})

export const validationSchema = Yup.object().shape({
  input_source: Yup.mixed<TransformInputSource>().optional(),
  input_key: Yup.string().optional(),
  on_error: Yup.mixed<TransformErrorStrategy>().optional(),
  mappings: Yup.array()
    .of(mappingValidationSchema)
    .min(1, 'At least one mapping is required')
    .required('At least one mapping is required'),
  output_schema: Yup.string()
    .optional()
    .test('is-valid-json', 'Invalid JSON format', function (value) {
      if (!value || value.trim() === '') {
        return true
      }
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    }),
  default_output: Yup.string().when('on_error', ([on_error], schema) => {
    if (on_error === TransformErrorStrategy.DEFAULT)
      return schema.required('Default output is required')
    return schema.optional()
  }),
})
