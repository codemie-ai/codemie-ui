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

import { yupResolver } from '@hookform/resolvers/yup'
import { forwardRef, useImperativeHandle } from 'react'
import { useForm, Controller } from 'react-hook-form'

import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import Textarea from '@/components/form/Textarea'
import TooltipButton from '@/components/TooltipButton'
import { NodeTypes } from '@/types/workflowEditor/base'
import {
  TransformConfig,
  TransformInputSource,
  TransformErrorStrategy,
} from '@/types/workflowEditor/configuration'

import FieldController from './FieldController'
import MappingBuilder from './MappingBuilder'
import { validationSchema } from './transformFormSchemas'
import { registerFields } from '../../utils/visualEditorFieldRegistry'

registerFields(
  [
    'input_source',
    'input_key',
    'on_error',
    'default_output',
    'output_schema',
    /^config\.mappings\./,
  ],
  NodeTypes.TRANSFORM
)

export interface TransformFormRef {
  getValues: () => TransformConfig
  validate: () => Promise<boolean>
  isDirty: () => boolean
  reset: () => void
}

interface TransformFormProps {
  stateId: string
  transformConfig: TransformConfig
}

const TransformForm = forwardRef<TransformFormRef, TransformFormProps>(
  ({ transformConfig, stateId }, ref) => {
    const { control, getValues, trigger, watch, formState, clearErrors, reset } =
      useForm<TransformConfig>({
        resolver: yupResolver(validationSchema) as any,
        mode: 'onChange',
        defaultValues: {
          input_source: transformConfig.input_source ?? TransformInputSource.CONTEXT_STORE,
          input_key: transformConfig.input_key ?? '',
          on_error: transformConfig.on_error ?? TransformErrorStrategy.FAIL,
          mappings: transformConfig.mappings ?? [],
          output_schema: transformConfig.output_schema
            ? JSON.stringify(transformConfig.output_schema, null, 2)
            : '',
          default_output: transformConfig.default_output,
        },
      })

    const onErrorValue = watch('on_error')

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => {
          const values = getValues()
          return {
            ...values,
            output_schema: values.output_schema
              ? JSON.parse(values.output_schema as unknown as string)
              : undefined,
            default_output: values.default_output,
          }
        },
        validate: async () => {
          return trigger()
        },
        isDirty: () => formState.isDirty,
        reset: () => reset(getValues()),
      }),
      [getValues, trigger, formState.isDirty, reset]
    )

    return (
      <div className="flex flex-col gap-4">
        <FieldController
          name="input_source"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              id="input_source_select"
              label="Input Source"
              hint="Where to read data from:
- context_store: Workflow context (most common)
- messages: Last message content
- user_input: User's initial input
- state_schema: Custom state fields"
              {...field}
              error={fieldState.error?.message}
              options={[
                { label: 'Context Store', value: TransformInputSource.CONTEXT_STORE },
                { label: 'Messages', value: TransformInputSource.MESSAGES },
                { label: 'User Input', value: TransformInputSource.USER_INPUT },
                { label: 'State Schema', value: TransformInputSource.STATE_SCHEMA },
              ]}
              allowCustom
            />
          )}
        />
        <FieldController
          name="input_key"
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              label="Input Key"
              placeholder="e.g., api_response"
              error={fieldState.error?.message}
              hint="Optional: specific key to extract from input source"
            />
          )}
        />
        <FieldController
          name="on_error"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              id="error_handling_select"
              label="Error Handling"
              hint="How to handle transformation errors:
- fail: Abort workflow (default)
- skip: Return empty dict, continue
- default: Use default_output"
              {...field}
              error={fieldState.error?.message}
              options={[
                { label: 'Fail (abort workflow)', value: TransformErrorStrategy.FAIL },
                { label: 'Skip (return empty)', value: TransformErrorStrategy.SKIP },
                { label: 'Use Default Output', value: TransformErrorStrategy.DEFAULT },
              ]}
              allowCustom
            />
          )}
        />
        {onErrorValue === TransformErrorStrategy.DEFAULT && (
          <FieldController
            name="default_output"
            control={control}
            render={({ field, fieldState }) => (
              <Textarea
                {...field}
                value={field.value as string}
                label="Default Output"
                placeholder='{"field": "default_value"}'
                rows={4}
                error={fieldState.error?.message}
                hint="Default output when error strategy is 'default'"
              />
            )}
          />
        )}
        <Controller
          name="mappings"
          control={control}
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="mappings_builder" className="text-xs text-text-quaternary">
                  Mappings
                </label>
                <TooltipButton content="Define transformations to apply to input data. Each mapping creates an output field." />
              </div>
              <MappingBuilder
                id="mappings_builder"
                stateId={stateId}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
                errors={formState.errors.mappings as any}
                onClearMappingErrors={(index) => clearErrors(`mappings.${index}` as any)}
              />
            </div>
          )}
        />
        <FieldController
          name="output_schema"
          control={control}
          render={({ field, fieldState }) => (
            <Textarea
              {...field}
              value={field.value as string}
              label="Output Schema"
              placeholder='{"properties": {"field": {"type": "string"}}, "required": ["field"]}'
              rows={6}
              error={fieldState.error?.message}
              hint="Optional: JSON Schema for output validation"
            />
          )}
        />
      </div>
    )
  }
)

export default TransformForm
