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

import { FieldDeclaration, SettingValue } from '@/types/entity/customerConfiguration'

/** Client-side mirror of the declared constraints. Never a replacement for the server check. */
export const validateField = (field: FieldDeclaration, value: SettingValue | undefined): string | null => {
  if (typeof value !== 'string') return null

  if (field.required && !value.trim()) {
    return `${field.label} is required`
  }

  if (field.max_length !== null && value.length > field.max_length) {
    return `${field.label} must be at most ${field.max_length} characters`
  }

  // an empty optional value has nothing to match; requiredness is the check above
  if (field.pattern && value && !new RegExp(field.pattern).test(value)) {
    return field.pattern_message ?? `${field.label} has an invalid format`
  }

  return null
}

export const validateFields = (
  fields: FieldDeclaration[],
  value: Record<string, SettingValue>
): Record<string, string> =>
  fields.reduce<Record<string, string>>((errors, field) => {
    const error = validateField(field, value[field.name])
    if (error) errors[field.name] = error
    return errors
  }, {})
