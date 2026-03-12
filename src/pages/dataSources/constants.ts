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

export const BASE_SCHEMA_KEY = 'base_schema'
export const CREATE_SCHEMA_KEY = 'create_schema'

export const PROVIDER_FIELD_TYPES = {
  NUMBER: 'Number',
  STRING: 'String',
  BOOLEAN: 'Boolean',
  SECRET: 'Secret',
  URL: 'URL',
  LIST: 'List',
  MULTISELECT: 'Multiselect',
} as const

export const PROVIDER_STRINGISH_TYPES: Array<
  (typeof PROVIDER_FIELD_TYPES)[keyof typeof PROVIDER_FIELD_TYPES]
> = [
  PROVIDER_FIELD_TYPES.STRING,
  PROVIDER_FIELD_TYPES.SECRET,
  PROVIDER_FIELD_TYPES.URL,
  PROVIDER_FIELD_TYPES.NUMBER,
]

export const PROVIDER_SKIPPED_FIELDS = ['name', 'description']
