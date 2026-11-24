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
import isEqual from 'lodash/isEqual'
import toInteger from 'lodash/toInteger'
import toNumber from 'lodash/toNumber'
import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'

import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import Switch from '@/components/form/Switch'
import TooltipButton from '@/components/TooltipButton'
import { useSubWorkflowEnabled, useWorkflowContractsEnabled } from '@/hooks/useFeatureFlags'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { cleanObject } from '@/utils/helpers'
import toaster from '@/utils/toaster'
import { DEFAULT_RETRY_MAX_ATTEMPTS } from '@/utils/workflowEditor/constants'
import { VALIDATION_MODES } from '@/utils/workflowEditor/helpers/contractProtocol'

import { useWorkflowContext } from '../hooks/useWorkflowContext'
import ConfigAccordion from './components/ConfigAccordion'
import FieldController from './components/FieldController'
import TabFooter from './components/TabFooter'
import {
  buildModeOptions,
  REQUIRE_INPUT_CONTRACTS_HINT,
  SKIP_WHEN_CONTRACTS_OFF,
  WORKFLOW_MODE_HINT,
  WORKFLOW_MODE_SELECT_ID,
} from './utils/contractModes'

const MSG_POSITIVE = 'Must be a positive number'
const MSG_INTEGER = 'Must be an integer'

const DEFAULT_MODE_LABEL = 'Default (warn)'

const MODE_OPTIONS = buildModeOptions(DEFAULT_MODE_LABEL)

const transformToInteger = (_value: any, originalValue: any) => {
  if (originalValue === '' || originalValue == null) return null
  return toInteger(originalValue)
}

const transformToNumber = (_value: any, originalValue: any) => {
  if (originalValue === '' || originalValue == null) return null
  return toNumber(originalValue)
}

const schema = yup.object().shape({
  enable_summarization_node: yup.boolean().optional(),
  save_validation: yup
    .string()
    .oneOf(['', ...VALIDATION_MODES])
    .optional()
    .when('$contractsEnabled', SKIP_WHEN_CONTRACTS_OFF),
  require_input_contracts: yup
    .boolean()
    .optional()
    .when('$contractsEnabled', SKIP_WHEN_CONTRACTS_OFF),
  tokens_limit_before_summarization: yup
    .number()
    .nullable()
    .optional()
    .transform(transformToInteger)
    .positive(MSG_POSITIVE)
    .integer(MSG_INTEGER)
    .max(1000000000, 'Must be at most 1000000000'),
  messages_limit_before_summarization: yup
    .number()
    .nullable()
    .optional()
    .transform(transformToInteger)
    .positive(MSG_POSITIVE)
    .integer(MSG_INTEGER)
    .max(10000, 'Must be at most 10000'),
  max_concurrency: yup
    .number()
    .nullable()
    .optional()
    .transform(transformToInteger)
    .positive(MSG_POSITIVE)
    .integer(MSG_INTEGER)
    .max(100, 'Must be at most 100'),
  recursion_limit: yup
    .number()
    .nullable()
    .optional()
    .transform(transformToInteger)
    .positive(MSG_POSITIVE)
    .integer(MSG_INTEGER)
    .max(5000, 'Must be at most 5000'),
  retry_policy: yup
    .object()
    .shape({
      max_attempts: yup
        .number()
        .nullable()
        .optional()
        .transform(transformToInteger)
        .positive(MSG_POSITIVE)
        .integer(MSG_INTEGER)
        .max(100, 'Must be at most 100'),
      initial_interval: yup
        .number()
        .nullable()
        .optional()
        .transform(transformToNumber)
        .positive(MSG_POSITIVE)
        .max(3600000, 'Must be at most 3600000'),
      max_interval: yup
        .number()
        .nullable()
        .optional()
        .transform(transformToNumber)
        .positive(MSG_POSITIVE)
        .max(3600000, 'Must be at most 3600000')
        .when('initial_interval', (initial_interval, schema) => {
          return initial_interval[0]
            ? schema.min(
                initial_interval[0],
                'Max interval must be greater than or equal to initial interval'
              )
            : schema
        }),
      backoff_factor: yup
        .number()
        .nullable()
        .optional()
        .transform(transformToNumber)
        .positive(MSG_POSITIVE)
        .max(10, 'Must be at most 10'),
    })
    .optional(),
  max_nesting_level: yup
    .number()
    .nullable()
    .optional()
    .transform(transformToInteger)
    .positive(MSG_POSITIVE)
    .integer(MSG_INTEGER)
    .max(10, 'Must be at most 10'),
})

interface AdvancedConfigTabProps {
  config: WorkflowConfiguration
  workflow?: Partial<WorkflowConfiguration>
  onConfigChange: (config: Partial<WorkflowConfiguration>) => void
  onClose: (skipDirtyCheck?: boolean) => void
}

export interface AdvancedConfigTabRef {
  isDirty: () => boolean
  save: () => Promise<boolean>
}

const getDefaultValues = (
  config: WorkflowConfiguration,
  workflow?: Partial<WorkflowConfiguration>
): Partial<WorkflowConfiguration> => {
  // Try to read from config first (after save, these fields are in yaml_config)
  // Fallback to workflow (on first load, these fields are in workflow but not in yaml_config yet)
  const defaults: Partial<WorkflowConfiguration> = {
    enable_summarization_node:
      config?.enable_summarization_node ?? workflow?.enable_summarization_node ?? true,
    tokens_limit_before_summarization:
      config?.tokens_limit_before_summarization ??
      workflow?.tokens_limit_before_summarization ??
      undefined,
    messages_limit_before_summarization:
      config?.messages_limit_before_summarization ??
      workflow?.messages_limit_before_summarization ??
      undefined,
    max_concurrency: config?.max_concurrency ?? workflow?.max_concurrency ?? undefined,
    recursion_limit: config?.recursion_limit ?? workflow?.recursion_limit ?? undefined,
    max_nesting_level: config?.max_nesting_level ?? workflow?.max_nesting_level ?? undefined,
    save_validation: config?.save_validation ?? workflow?.save_validation ?? undefined,
    require_input_contracts:
      config?.require_input_contracts ?? workflow?.require_input_contracts ?? false,
  }

  // Only include retry_policy if it has at least one non-null value
  // This prevents React Hook Form from marking the form as dirty when retry_policy has all null values
  const retryPolicy = config?.retry_policy ?? workflow?.retry_policy
  if (retryPolicy) {
    const hasAnyValue =
      retryPolicy.max_attempts != null ||
      retryPolicy.initial_interval != null ||
      retryPolicy.max_interval != null ||
      retryPolicy.backoff_factor != null

    if (hasAnyValue) {
      defaults.retry_policy = {
        max_attempts: retryPolicy.max_attempts ?? undefined,
        initial_interval: retryPolicy.initial_interval ?? undefined,
        max_interval: retryPolicy.max_interval ?? undefined,
        backoff_factor: retryPolicy.backoff_factor ?? undefined,
      }
    }
  }

  return defaults
}

const cleanFormValues = (values: any) => {
  const cleaned = cleanObject(values || {})

  // Remove retry_policy if it's an empty object
  if (
    cleaned.retry_policy &&
    Object.values(cleaned.retry_policy).every((v) => v == null || v === '')
  ) {
    delete cleaned.retry_policy
  }

  // An off switch means "not required": the key is omitted rather than written as false
  if (!cleaned.require_input_contracts) {
    delete cleaned.require_input_contracts
  }

  return cleaned
}

// updateAdvancedConfig keeps the old value of a key that is absent from the update, so the
// two contract defaults are always sent, as undefined when unset, to be able to clear them.
const withContractDefaults = (data: Partial<WorkflowConfiguration>) => ({
  ...data,
  save_validation: data.save_validation,
  require_input_contracts: data.require_input_contracts,
})

const AdvancedConfigTab = forwardRef<AdvancedConfigTabRef, AdvancedConfigTabProps>(
  ({ config, workflow, onConfigChange, onClose }, ref) => {
    const defaultValuesRef = useRef(getDefaultValues(config, workflow))
    const { activeIssue } = useWorkflowContext()
    const [contractsEnabled] = useWorkflowContractsEnabled()

    const { control, reset, trigger, getValues } = useForm<Partial<WorkflowConfiguration>>({
      resolver: yupResolver(schema) as any,
      mode: 'onChange',
      defaultValues: defaultValuesRef.current,
      context: { contractsEnabled },
    })

    const [summarizationExpanded, setSummarizationExpanded] = useState(true)
    const [performanceExpanded, setPerformanceExpanded] = useState(false)
    const [retryPolicyExpanded, setRetryPolicyExpanded] = useState(false)
    const [subWorkflowExpanded, setSubWorkflowExpanded] = useState(false)
    const [contractsExpanded, setContractsExpanded] = useState(false)
    const [isSubWorkflowEnabled, isSubWorkflowLoaded] = useSubWorkflowEnabled()

    const activeIssueAccordion = useMemo(() => {
      if (!activeIssue?.path) return null

      const { path } = activeIssue
      if (
        path === 'enable_summarization_node' ||
        path === 'tokens_limit_before_summarization' ||
        path === 'messages_limit_before_summarization'
      ) {
        return 'summarization'
      }
      if (path === 'max_concurrency' || path === 'recursion_limit') {
        return 'performance'
      }
      if (path.startsWith('retry_policy.') || path === 'retry_policy') {
        return 'retryPolicy'
      }
      if (path === 'max_nesting_level') {
        return 'subWorkflow'
      }
      if (path === 'save_validation' || path === 'require_input_contracts') {
        return 'contracts'
      }
      return null
    }, [activeIssue?.path])

    useEffect(() => {
      if (activeIssueAccordion === 'summarization' && !summarizationExpanded) {
        setSummarizationExpanded(true)
      } else if (activeIssueAccordion === 'performance' && !performanceExpanded) {
        setPerformanceExpanded(true)
      } else if (activeIssueAccordion === 'retryPolicy' && !retryPolicyExpanded) {
        setRetryPolicyExpanded(true)
      } else if (activeIssueAccordion === 'subWorkflow' && !subWorkflowExpanded) {
        setSubWorkflowExpanded(true)
      } else if (activeIssueAccordion === 'contracts' && !contractsExpanded) {
        setContractsExpanded(true)
      }
    }, [
      activeIssueAccordion,
      summarizationExpanded,
      performanceExpanded,
      retryPolicyExpanded,
      subWorkflowExpanded,
      contractsExpanded,
    ])

    const saveData = async (): Promise<boolean> => {
      const isValid = await trigger()
      if (isValid) {
        const data = cleanFormValues(schema.cast(getValues()) as Partial<WorkflowConfiguration>)
        reset(data)
        onConfigChange(withContractDefaults(data))
        return true
      }
      return false
    }

    useImperativeHandle(
      ref,
      () => ({
        isDirty: () => {
          const cleanDefaults = cleanFormValues(defaultValuesRef.current)
          const cleanCurrent = cleanFormValues(getValues())
          return !isEqual(cleanDefaults, cleanCurrent)
        },
        save: saveData,
      }),
      [getValues, trigger, onConfigChange, reset]
    )

    useEffect(() => {
      const newDefaults = getDefaultValues(config, workflow)
      if (!isEqual(defaultValuesRef.current, newDefaults)) {
        defaultValuesRef.current = newDefaults
        reset(newDefaults)
      }
    }, [config, workflow, reset])

    const handleSave = async () => {
      const success = await saveData()
      if (success) {
        toaster.info('Workflow configuration has been saved')
        onClose(true)
      }
    }

    return (
      <>
        <form className="flex flex-col gap-4">
          <ConfigAccordion
            title="Summarization Settings"
            expanded={summarizationExpanded}
            onExpandedChange={setSummarizationExpanded}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <FieldController
                  name="enable_summarization_node"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Switch
                      id="enable_summarization_node"
                      label="Enable Summarization"
                      value={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      error={fieldState.error?.message}
                      ref={field.ref}
                    />
                  )}
                />
                <p className="text-xs text-text-quaternary mt-1">
                  Turns on automatic summarization of long text or data.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="tokens_limit_before_summarization"
                  className="text-xs text-text-primary flex items-center gap-1"
                >
                  Tokens Limit Before Summarization
                  <TooltipButton content="Sets the token threshold that triggers summarization. Must be a positive integer. Maximum: 1000000000." />
                </label>
                <FieldController
                  name="tokens_limit_before_summarization"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      id="tokens_limit_before_summarization"
                      type="number"
                      placeholder="100000"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="messages_limit_before_summarization"
                  className="text-xs text-text-primary flex items-center gap-1"
                >
                  Messages Limit Before Summarization
                  <TooltipButton content="Sets the number of messages which triggers summarization. Must be a positive integer. Maximum: 10000." />
                </label>
                <FieldController
                  name="messages_limit_before_summarization"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      id="messages_limit_before_summarization"
                      type="number"
                      placeholder="20"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
              </div>
            </div>
          </ConfigAccordion>

          <ConfigAccordion
            title="Performance Settings"
            expanded={performanceExpanded}
            onExpandedChange={setPerformanceExpanded}
          >
            <div className="flex flex-col gap-4">
              <FieldController
                name="max_concurrency"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    id="max_concurrency"
                    type="number"
                    label="Max Concurrency"
                    orientation="horizontal"
                    hint="Defines how many tasks run in parallel. Must be a positive integer. Maximum: 100."
                    placeholder="10"
                    inputClass="w-12"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />

              <FieldController
                name="recursion_limit"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    id="recursion_limit"
                    type="number"
                    label="Recursion Limit"
                    orientation="horizontal"
                    hint="Sets max recursion depth to avoid infinite loops. Must be a positive integer. Typical range: 25-100."
                    placeholder="25"
                    inputClass="w-12"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            </div>
          </ConfigAccordion>

          <ConfigAccordion
            title="Retry Policy"
            expanded={retryPolicyExpanded}
            onExpandedChange={setRetryPolicyExpanded}
          >
            <div className="flex flex-col gap-4">
              <FieldController
                name="retry_policy.max_attempts"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    id="retry_policy_max_attempts"
                    type="number"
                    label="Max Attempts"
                    orientation="horizontal"
                    hint={`Total number of attempts, including the first execution (not the number of retries). 1 means run once with no retries. Leave empty to use the server default (${DEFAULT_RETRY_MAX_ATTEMPTS}). Must be a positive integer. Maximum: 100.`}
                    placeholder={String(DEFAULT_RETRY_MAX_ATTEMPTS)}
                    inputClass="w-12"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />

              <FieldController
                name="retry_policy.initial_interval"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    id="retry_policy_initial_interval"
                    type="number"
                    label="Initial Interval (sec)"
                    orientation="horizontal"
                    hint="Time (seconds) before the first retry after a failure. Must be a positive number. Maximum: 3600000 seconds."
                    placeholder="1"
                    inputClass="w-12"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />

              <FieldController
                name="retry_policy.max_interval"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    id="retry_policy_max_interval"
                    type="number"
                    label="Max Interval (sec)"
                    orientation="horizontal"
                    hint="Upper limit of delay between retries. Must be >= initial interval. Maximum: 3600000 seconds."
                    placeholder="60"
                    inputClass="w-12"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />

              <FieldController
                name="retry_policy.backoff_factor"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    id="retry_policy_backoff_factor"
                    type="number"
                    step="0.1"
                    label="Backoff Factor"
                    orientation="horizontal"
                    hint="Multiplier to increase the interval between retries. Must be a positive number. Maximum: 10."
                    placeholder="2"
                    inputClass="w-12"
                    error={fieldState.error?.message}
                    {...field}
                  />
                )}
              />
            </div>
          </ConfigAccordion>

          {contractsEnabled && (
            <ConfigAccordion
              title="Contracts"
              expanded={contractsExpanded}
              onExpandedChange={setContractsExpanded}
            >
              <div className="flex flex-col gap-4">
                <FieldController
                  name="save_validation"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Select
                      id={WORKFLOW_MODE_SELECT_ID}
                      label="Save validation"
                      hint={WORKFLOW_MODE_HINT}
                      value={field.value || null}
                      placeholder={DEFAULT_MODE_LABEL}
                      inputRef={field.ref}
                      error={fieldState.error?.message}
                      options={MODE_OPTIONS}
                      onChangeValue={(value) => field.onChange(value ?? '')}
                    />
                  )}
                />

                <FieldController
                  name="require_input_contracts"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Switch
                      id="require_input_contracts"
                      label="Require input contracts"
                      hint={REQUIRE_INPUT_CONTRACTS_HINT}
                      value={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      error={fieldState.error?.message}
                      ref={field.ref}
                    />
                  )}
                />
              </div>
            </ConfigAccordion>
          )}

          {isSubWorkflowEnabled && isSubWorkflowLoaded && (
            <ConfigAccordion
              title="Sub-workflow"
              expanded={subWorkflowExpanded}
              onExpandedChange={setSubWorkflowExpanded}
            >
              <div className="flex flex-col gap-4">
                <FieldController
                  name="max_nesting_level"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      id="max_nesting_level"
                      type="number"
                      label="Max Nesting Level"
                      orientation="horizontal"
                      hint="Maximum sub-workflow nesting depth. Empty = server default. Range: 1–10."
                      placeholder=""
                      inputClass="w-12"
                      error={fieldState.error?.message}
                      {...field}
                    />
                  )}
                />
              </div>
            </ConfigAccordion>
          )}
        </form>

        <TabFooter onCancel={() => onClose(true)} onSave={handleSave} />
      </>
    )
  }
)

AdvancedConfigTab.displayName = 'AdvancedConfigTab'

export default AdvancedConfigTab
