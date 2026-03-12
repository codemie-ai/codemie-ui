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

export enum DefinitionTypes {
  String = 'string',
  Date = 'date',
  User = 'user',
  Boolean = 'boolean',
  RadioGroup = 'radioGroup',
  Custom = 'custom',
}

export interface SortState {
  sortKey?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationState {
  page: number
  perPage: number
}

export interface ColumnDefinition {
  label: string
  key: string
  type: DefinitionTypes | `${DefinitionTypes}`
  maxLength?: number
  sortable?: boolean
  headClassNames?: string
  shrink?: boolean
  semiBold?: boolean
}

export interface TableItem {
  [key: string]: unknown
}
