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

import React from 'react'
import { Controller, Control } from 'react-hook-form'

import Input from '@/components/form/Input'
import Textarea from '@/components/form/Textarea'

import { MCPFormValues } from './formTypes'

interface MCPBasicFieldsProps {
  control: Control<MCPFormValues>
  isEditing: boolean
}

const MCPBasicFields: React.FC<MCPBasicFieldsProps> = ({ control, isEditing }) => {
  return (
    <>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            label="Name"
            placeholder="Name*"
            minLength={4}
            maxLength={50}
            disabled={isEditing}
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />

      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Textarea
            label="Description"
            placeholder="Description*"
            rows={2}
            error={fieldState.error?.message}
            {...field}
          />
        )}
      />

      <Controller
        name="tokensSizeLimit"
        control={control}
        render={({ field, fieldState }) => (
          <div className="flex flex-col gap-2">
            <Input
              label="Tools Tokens Size Limit"
              placeholder="30000"
              min={0}
              type="number"
              error={fieldState.error?.message}
              {...field}
            />
            <div className="text-xs text-text-quaternary">
              Maximum size of tokens for the tools (default: 30000).
            </div>
          </div>
        )}
      />
    </>
  )
}

export default MCPBasicFields
