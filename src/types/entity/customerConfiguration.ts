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

export type FieldType = 'switch' | 'input' | 'textarea'

export type Markup = 'plain' | 'markdown'

export type SettingValue = boolean | string

export interface FieldDeclaration {
  name: string
  type: FieldType
  label: string
  description: string | null
  required: boolean
  max_length: number | null
  pattern: string | null
  pattern_message: string | null
  markup: Markup
}

export interface SettingDeclaration {
  component_id: string
  label: string
  description: string | null
  overridden: boolean
  value: Record<string, SettingValue>
  fields: FieldDeclaration[]
}

export interface SettingUpdateResponse {
  component_id: string
  settings: Record<string, SettingValue>
}
