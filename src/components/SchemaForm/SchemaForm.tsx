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

import { FC, useEffect } from 'react'

import { FieldDeclaration, SettingValue } from '@/types/entity/customerConfiguration'

import { fieldRegistry } from './fieldRegistry'
import { validateFields } from './validation'

interface Props {
  fields: FieldDeclaration[]
  value: Record<string, SettingValue>
  onChange: (value: Record<string, SettingValue>) => void
  onValidityChange?: (isValid: boolean) => void
}

const SchemaForm: FC<Props> = ({ fields, value, onChange, onValidityChange }) => {
  const errors = validateFields(fields, value)
  const isValid = Object.keys(errors).length === 0

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        const Control = fieldRegistry[field.type]

        if (!Control) {
          console.warn(`SchemaForm: no control registered for field type "${field.type}"`)
          return null
        }

        return (
          <Control
            key={field.name}
            field={field}
            value={value[field.name]}
            error={errors[field.name]}
            onChange={(next: SettingValue) => onChange({ ...value, [field.name]: next })}
          />
        )
      })}
    </div>
  )
}

export default SchemaForm
