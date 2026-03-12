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

/**
 * Shared types for dynamic form components
 */

export const FIELD_TYPES = {
  BOOLEAN: 'bool',
  INTEGER: 'int',
  FLOAT: 'float',
  STRING: 'str',
  LIST: 'list',
  TEXT: 'text',
} as const

export type FieldType = (typeof FIELD_TYPES)[keyof typeof FIELD_TYPES]

export interface DynamicFormFieldSchema {
  type: FieldType
  required: boolean
  description?: string
  values?: string[] | null
}
