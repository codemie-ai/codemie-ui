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

import { jsonValidator, commandOrUrlXorValidator, streamableHttpValidator } from './validators'

interface FormSchemaParams {
  nameUniqueValidator: (value: string) => boolean
}

export const createFormSchema = ({ nameUniqueValidator }: FormSchemaParams) => {
  return Yup.object({
    name: Yup.string()
      .required('MCP server name is required')
      .test('unique', 'MCP server name should be unique', nameUniqueValidator)
      .max(50, 'MCP server name is limited to 50 characters')
      .min(4, 'MCP server name must be between 4 and 50 characters'),
    description: Yup.string().required('Description is required').max(2000),
    connectUrl: Yup.string().notRequired().url('This field must be a valid URL').nonNullable(),
    tokensSizeLimit: Yup.number()
      .transform((value, originalValue) => {
        return originalValue === '' ? null : value
      })
      .nullable()
      .notRequired()
      .min(0, 'Tokens size cannot be less than zero')
      .max(1000000, 'Maximum tokens for tool output is 1000000'),
    configJson: Yup.string()
      .test('format', 'Invalid JSON format', jsonValidator)
      .test(
        'command-or-url-xor',
        'Configuration must include exactly one of "command" or "url" (not both)',
        commandOrUrlXorValidator
      )
      .test(
        'streamable-http',
        'When type is "streamable-http", "url" field is required',
        streamableHttpValidator
      ),
    command: Yup.string().notRequired(),
    arguments: Yup.string().notRequired(),
  })
}
