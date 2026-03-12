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

import * as yup from 'yup'

export const mcpServerSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(1, 'Name must be at least 1 character')
    .max(255, 'Name must not exceed 255 characters'),

  description: yup
    .string()
    .required('Description is required')
    .max(2000, 'Description must not exceed 2000 characters'),

  server_home_url: yup
    .string()
    .required('Link to MCP documentation is required')
    .url('Must be a valid URL'),

  source_url: yup.string().required('Link to source code is required').url('Must be a valid URL'),

  icon_url: yup.string().url('Must be a valid URL').optional(),

  categories: yup.array().of(yup.string()).max(3, 'Maximum 3 categories allowed').optional(),

  serverConfig: yup
    .string()
    .required('Server config is required')
    .test('is-json', 'Invalid JSON format', (value) => {
      if (!value) return false
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    }),

  required_env_vars: yup
    .array()
    .of(
      yup.object({
        name: yup.string().required('Variable name is required'),
        description: yup.string(),
        required: yup.boolean(),
      })
    )
    .optional(),
})

export type MCPServerFormData = yup.InferType<typeof mcpServerSchema>
