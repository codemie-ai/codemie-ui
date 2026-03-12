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
import * as Yup from 'yup'

import ExpandableTextarea from '@/components/form/ExpandableTextarea/ExpandableTextarea'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import Switch from '@/components/form/Switch'
import TooltipButton from '@/components/TooltipButton'
import { CommonStateConfiguration, RetryPolicy } from '@/types/workflowEditor/configuration'
import { START_NODE_ID, END_NODE_ID } from '@/utils/workflowEditor/constants'

import ConfigAccordion from './components/ConfigAccordion'

const CONTEXT_STORE_KEEP_CURRENT = 'keep_current'

/** Normalize clear_context_store value to valid option */
const normalizeClearContextStore = (val: any): boolean | 'keep_current' => {
  if (val === CONTEXT_STORE_KEEP_CURRENT) return CONTEXT_STORE_KEEP_CURRENT
  if (val === true || val === 'true') return true
  return false
}

export interface CommonNodeFieldValues {
  id: string
  task?: string
  output_schema?: string
  interrupt_before?: boolean
  finish_iteration?: boolean
  resolve_dynamic_values_in_prompt?: boolean
  result_as_human_message?: boolean
  retry_policy?: RetryPolicy
  next?: {
    output_key?: string
    append_to_context?: boolean
    include_in_llm_history?: boolean
    override_task?: boolean
    store_in_context?: boolean
    clear_prior_messages?: boolean
    clear_context_store?: boolean | 'keep_current'
    reset_keys_in_context_store?: string[]
  }
}

interface CommonNodeFieldsProps {
  state: CommonStateConfiguration
  idDisabled?: boolean
  showAllFields?: boolean
}

const getDefaultValues = (state: CommonStateConfiguration): CommonNodeFieldValues => {
  return {
    id: state?.id || '',
    task: state?.task || '',
    output_schema: state?.output_schema || '',
    interrupt_before: state?.interrupt_before || false,
    finish_iteration: state?.finish_iteration || false,
    resolve_dynamic_values_in_prompt: state?.resolve_dynamic_values_in_prompt || false,
    result_as_human_message: state?.result_as_human_message || false,
    retry_policy: state?.retry_policy || undefined,
    next: {
      output_key: state?.next?.output_key || '',
      append_to_context: state?.next?.append_to_context || false,
      // These fields default to true in UI when undefined (undefined means true in backend)
      include_in_llm_history:
        state?.next?.include_in_llm_history === undefined
          ? true
          : state.next.include_in_llm_history,
      store_in_context:
        state?.next?.store_in_context === undefined ? true : state.next.store_in_context,
      // These fields default to false
      override_task: state?.next?.override_task || false,
      clear_prior_messages: state?.next?.clear_prior_messages || false,
      clear_context_store: normalizeClearContextStore(state?.next?.clear_context_store) || false,
      reset_keys_in_context_store: state?.next?.reset_keys_in_context_store || [],
    },
  }
}

export interface CommonStateFieldsRef {
  getValues: () => CommonNodeFieldValues
  validate: () => Promise<boolean>
  isDirty: () => boolean
  reset: () => void
}

const validationSchema = Yup.object().shape({
  id: Yup.string()
    .required('State ID is required')
    .matches(
      /^[a-zA-Z0-9_-]+$/,
      'State ID can only contain letters, numbers, hyphens, and underscores'
    )
    .test('forbidden-state-ids', 'This value is not allowed', (value) => {
      if (!value) return true
      const forbidden = [START_NODE_ID, END_NODE_ID]
      return !forbidden.includes(value.toLowerCase())
    }),
  task: Yup.string().optional(),
  output_schema: Yup.string().optional(),
  interrupt_before: Yup.boolean().optional(),
  finish_iteration: Yup.boolean().optional(),
  resolve_dynamic_values_in_prompt: Yup.boolean().optional(),
  result_as_human_message: Yup.boolean().optional(),
  retry_policy: Yup.object()
    .shape({
      initial_interval: Yup.number().min(0, 'Must be >= 0').optional(),
      backoff_factor: Yup.number().min(1, 'Must be >= 1').optional(),
      max_interval: Yup.number().min(0, 'Must be >= 0').optional(),
      max_attempts: Yup.number().min(1, 'Must be >= 1').optional(),
    })
    .optional(),
  next: Yup.object()
    .shape({
      output_key: Yup.string().optional(),
      append_to_context: Yup.boolean().optional(),
      include_in_llm_history: Yup.boolean().optional(),
      override_task: Yup.boolean().optional(),
      store_in_context: Yup.boolean().optional(),
      clear_prior_messages: Yup.boolean().optional(),
      clear_context_store: Yup.mixed().oneOf([true, false, 'keep_current']).optional(),
      reset_keys_in_context_store: Yup.array().of(Yup.string()).optional(),
    })
    .optional(),
})

const CommonStateFields = forwardRef<CommonStateFieldsRef, CommonNodeFieldsProps>(
  ({ state, idDisabled = false, showAllFields = true }, ref) => {
    const {
      control,
      getValues,
      trigger,
      formState: { isDirty },
      reset,
    } = useForm<CommonNodeFieldValues>({
      resolver: yupResolver(validationSchema) as any,
      mode: 'onChange',
      defaultValues: getDefaultValues(state),
    })

    useImperativeHandle(
      ref,
      () => ({
        getValues,
        validate: async () => {
          return trigger()
        },
        isDirty: () => isDirty,
        reset: () => reset(getValues()),
      }),
      [getValues, trigger, isDirty, reset]
    )

    return (
      <>
        <ConfigAccordion title="State Settings" defaultExpanded={true}>
          <div className="flex flex-col gap-4">
            <Controller
              name="id"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  label="State ID"
                  placeholder="e.g., analyze_code"
                  error={fieldState.error?.message}
                  disabled={idDisabled}
                  required
                />
              )}
            />

            {showAllFields && (
              <>
                <Controller
                  name="task"
                  control={control}
                  render={({ field, fieldState }) => (
                    <ExpandableTextarea
                      {...field}
                      label="Task"
                      placeholder="Describe the task for this node"
                      rows={4}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  name="output_schema"
                  control={control}
                  render={({ field, fieldState }) => (
                    <ExpandableTextarea
                      {...field}
                      label="Output Schema"
                      placeholder="Expected output format (JSON Schema)"
                      rows={4}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  name="interrupt_before"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Interrupt Before"
                      value={field.value}
                      hint="Pause workflow execution before specified nodes to allow manual review or intervention."
                    />
                  )}
                />

                <Controller
                  name="finish_iteration"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Finish Iteration"
                      value={field.value}
                      hint="Complete the current workflow iteration fully before stopping, ensuring the workflow reaches a logical completion point."
                    />
                  )}
                />

                <Controller
                  name="resolve_dynamic_values_in_prompt"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Resolve Dynamic Values in Prompt"
                      value={field.value}
                      hint="Automatically resolve variables, placeholders, and dynamic expressions (e.g., {{variable_name}}) in prompts before sending to the LLM."
                    />
                  )}
                />

                <Controller
                  name="result_as_human_message"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Result as Human Message"
                      value={field.value}
                      hint="Format workflow results as human messages in the conversation history instead of system messages."
                    />
                  )}
                />
              </>
            )}
          </div>
        </ConfigAccordion>

        {showAllFields && (
          <>
            <ConfigAccordion title="Transition Settings" defaultExpanded={false}>
              <div className="flex flex-col gap-4">
                <Controller
                  name="next.output_key"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      label="Output Key"
                      placeholder="e.g.: analysis_result"
                      error={fieldState.error?.message}
                      hint="Key to store the output of this state in the workflow context"
                    />
                  )}
                />

                <Controller
                  name="next.append_to_context"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Append to Context"
                      value={field.value}
                      hint="When enabled, the output of this state is accumulated into an array in the context store on each iteration, instead of overwriting the previous value."
                    />
                  )}
                />

                <Controller
                  name="next.include_in_llm_history"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Keep History"
                      value={field.value}
                      hint="If true, the state outcome from context store will be included in the message history sent to the LLM.

                            When false, the outcome is stored in context but not sent to LLM."
                    />
                  )}
                />

                <Controller
                  name="next.override_task"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Override Task"
                      value={field.value}
                      hint="Override the task definition for the next state"
                    />
                  )}
                />

                <Controller
                  name="next.store_in_context"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Store in Context"
                      value={field.value}
                      hint="If true, the state outcome will be stored in the context store.

                            When false, the state outcome will not be added to context_store, but may still be added to message history if Keep History is true."
                    />
                  )}
                />

                <Controller
                  name="next.clear_prior_messages"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      {...field}
                      label="Clear Prior Messages"
                      value={field.value}
                      hint="If true, all prior messages in the message history will be excluded from the message history sent to the LLM starting from this state.

                            This effectively creates a 'fresh start' for LLM context while preserving the full context_store for dynamic expression resolution."
                    />
                  )}
                />

                <Controller
                  name="next.clear_context_store"
                  control={control}
                  render={({ field }) => {
                    const displayValue = String(normalizeClearContextStore(field.value))

                    return (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="clear_context_store_select"
                            className="text-xs font-medium text-text-quaternary"
                          >
                            Clear Context Store
                          </label>
                          <TooltipButton
                            content="Controls context store clearing behavior after this state executes.

                              Supported values:
                              - No: Don't clear context store, merge new values with existing context
                              - Yes: Clear entire context store (all keys removed, including new values from this state)
                              - keep_current: Keep only new values from this state, discard all previous context
                            "
                          />
                        </div>
                        <Select
                          id="clear_context_store_select"
                          value={displayValue}
                          onChange={(e) => {
                            const { value } = e
                            const computedValue =
                              value === CONTEXT_STORE_KEEP_CURRENT
                                ? CONTEXT_STORE_KEEP_CURRENT
                                : value === 'true'
                            field.onChange(computedValue)
                          }}
                          options={[
                            { label: 'No', value: 'false' },
                            { label: 'Yes', value: 'true' },
                            { label: 'Keep Current', value: CONTEXT_STORE_KEEP_CURRENT },
                          ]}
                        />
                      </div>
                    )
                  }}
                />

                <Controller
                  name="next.reset_keys_in_context_store"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      label="Reset Context Keys"
                      placeholder="e.g.: user_data,analysis_result"
                      error={fieldState.error?.message}
                      hint="Comma-separated list of specific keys to remove from the context store during state transition.

                            When specified, only the listed keys will be removed from the context store, while all other keys remain preserved. This provides granular control over context cleanup without clearing the entire store.

                            Keys that don't exist in the context store are silently ignored. If a reset key is also present in the current state's output, it will be re-added with the new value.

                            Example:
                                user_data,analysis_result

                                # Only removes 'user_data' and 'analysis_result', keeps all other keys"
                      value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                      onChange={(e) => {
                        const { value } = e.target
                        const keys = value
                          .split(',')
                          .map((key) => key.trim())
                          .filter((key) => key.length > 0)
                        field.onChange(keys.length > 0 ? keys : [])
                      }}
                    />
                  )}
                />
              </div>
            </ConfigAccordion>

            <ConfigAccordion title="Retry Policy" defaultExpanded={false}>
              <div className="flex flex-col gap-3">
                <Controller
                  name="retry_policy.initial_interval"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-text-primary whitespace-nowrap min-w-[100px]">
                        Initial (s):
                      </label>
                      <Input
                        {...field}
                        placeholder="1"
                        type="number"
                        error={fieldState.error?.message}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="flex-1"
                      />
                    </div>
                  )}
                />

                <Controller
                  name="retry_policy.backoff_factor"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-text-primary whitespace-nowrap min-w-[100px]">
                        Backoff:
                      </label>
                      <Input
                        {...field}
                        placeholder="2"
                        type="number"
                        error={fieldState.error?.message}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="flex-1"
                      />
                    </div>
                  )}
                />

                <Controller
                  name="retry_policy.max_interval"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-text-primary whitespace-nowrap min-w-[100px]">
                        Max (s):
                      </label>
                      <Input
                        {...field}
                        placeholder="60"
                        type="number"
                        error={fieldState.error?.message}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="flex-1"
                      />
                    </div>
                  )}
                />

                <Controller
                  name="retry_policy.max_attempts"
                  control={control}
                  render={({ field, fieldState }) => (
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-text-primary whitespace-nowrap min-w-[100px]">
                        Attempts:
                      </label>
                      <Input
                        {...field}
                        placeholder="3"
                        type="number"
                        error={fieldState.error?.message}
                        onChange={(e) =>
                          field.onChange(e.target.value ? Number(e.target.value) : undefined)
                        }
                        className="flex-1"
                      />
                    </div>
                  )}
                />
              </div>
            </ConfigAccordion>
          </>
        )}
      </>
    )
  }
)

export default CommonStateFields
