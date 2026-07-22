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
 * Fixed-schema interactive element protocol for agent chat.
 * Mirrors the backend catalog; element `type` discriminators are snake_case wire values.
 */

export interface TextElement {
  type: 'text'
  content: string
}

export interface ColumnElement {
  type: 'column'
  children: InteractiveElement[]
}

export interface RowElement {
  type: 'row'
  children: InteractiveElement[]
}

export interface ButtonElement {
  type: 'button'
  id: string
  label: string
  style?: 'primary' | 'secondary' | 'danger'
}

export interface ChoiceOption {
  value: string
  label: string
}

export interface MultipleChoiceElement {
  type: 'multiple_choice'
  id: string
  options: ChoiceOption[]
  max_allowed_selections: number
}

export interface DropdownElement {
  type: 'dropdown'
  id: string
  label: string
  options: ChoiceOption[]
  placeholder?: string
  required?: boolean
}

export interface DatePickerElement {
  type: 'date_picker'
  id: string
  label: string
  min?: string | null
  max?: string | null
  required?: boolean
}

export interface FieldValidation {
  required?: boolean
  regex?: string | null
  email?: boolean
}

export interface TextFieldElement {
  type: 'text_field'
  id: string
  label: string
  validation?: FieldValidation | null
}

export interface CheckBoxElement {
  type: 'checkbox'
  id: string
  label: string
  validation?: FieldValidation | null
}

export type InteractiveElement =
  | TextElement
  | ColumnElement
  | RowElement
  | ButtonElement
  | MultipleChoiceElement
  | DropdownElement
  | DatePickerElement
  | TextFieldElement
  | CheckBoxElement

export interface InteractiveRequest {
  request_id: string
  surface: InteractiveElement[]
}

export type InteractiveResponseKind = 'action' | 'choice' | 'form' | 'submit' | 'text_fallback'

export interface InteractiveResponse {
  request_id: string
  kind: InteractiveResponseKind
  payload: Record<string, unknown>
}

export interface InteractiveFeaturesConfig {
  action_buttons: boolean
  choice: boolean
  short_forms: boolean
}
