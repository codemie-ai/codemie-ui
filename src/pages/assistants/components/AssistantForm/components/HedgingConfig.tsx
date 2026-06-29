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

import { FC, useRef, useState } from 'react'

import InfoBox from '@/components/form/InfoBox'
import Input from '@/components/form/Input'
import RecordInput, { RecordItem } from '@/components/form/RecordInput/RecordInput'
import { recordBadgeFromRequired } from '@/components/form/RecordInput/RecordItemBadge'
import Select from '@/components/form/Select'
import Switch from '@/components/form/Switch'
import Tabs from '@/components/Tabs'
import {
  AssistantContext,
  AssistantToolkit,
  HedgingConfig as HedgingConfigType,
} from '@/types/entity/assistant'
import { Provider, ProviderToolArgSchema } from '@/types/entity/provider'

type MappingEntry = RecordItem

const InputMappingField: FC<{
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
  argsSchema?: Record<string, ProviderToolArgSchema>
}> = ({ value, onChange, argsSchema }) => {
  const [entries, setEntries] = useState<MappingEntry[]>(() =>
    Object.entries(value ?? {}).map(([k, v]) => {
      const entry: MappingEntry = { key: k, value: v }
      const arg = argsSchema?.[k]
      if (arg) {
        entry.badge = recordBadgeFromRequired(arg.required)
      }
      return entry
    })
  )

  const handleChange = (newEntries: MappingEntry[]) => {
    setEntries(newEntries)
    const mapping: Record<string, string> = {}
    newEntries.forEach(({ key, value: v }) => {
      if (key) mapping[key] = v
    })
    onChange(mapping)
  }

  return (
    <RecordInput
      name="input_mapping"
      label="Input Mapping"
      hint="Map tool parameter names to Jinja2 template strings (e.g. {{query}}, {{user.id}})."
      value={entries}
      onChange={handleChange}
      addText="Add mapping"
    />
  )
}

const DEFAULT_PROVIDER_TOOL = {
  provider_name: '',
  toolkit_name: '',
  tool_name: '',
}

const DEFAULT_HEDGING_CONFIG: HedgingConfigType = {
  tool: null,
  provider_tool: { ...DEFAULT_PROVIDER_TOOL },
  timeout_ms: 200,
  input_mapping: {},
  output_field: null,
}

type HedgingConfigFormValue = {
  tool?: { name?: string } | null
  provider_tool?: {
    provider_name?: string
    toolkit_name?: string
    tool_name?: string
    datasource_name?: string | null
    result_condition?: string | null
  } | null
  timeout_ms?: number
  input_mapping?: Record<string, string>
  output_field?: string | null
}

interface HedgingConfigProps {
  value: HedgingConfigFormValue | null | undefined
  onChange: (value: HedgingConfigType | null) => void
  onBlur: () => void
  hedgeableToolkits: AssistantToolkit[]
  providers: Provider[]
  providerDatasources: AssistantContext[]
  toolError?: string
  timeoutError?: string
}

const HedgingConfig: FC<HedgingConfigProps> = ({
  value,
  onChange,
  onBlur,
  hedgeableToolkits,
  providers,
  providerDatasources,
  toolError,
  timeoutError,
}) => {
  const savedProviderToolRef = useRef<HedgingConfigType['provider_tool']>(null)

  const isEnabled = value !== null && value !== undefined
  const config = (value ?? DEFAULT_HEDGING_CONFIG) as HedgingConfigType

  const isProviderMode = config.provider_tool != null

  const toolOptions = hedgeableToolkits
    .flatMap((tk) => tk.tools)
    .map((t) => ({ label: t.label || t.name, value: t.name }))

  const providerOptions = providers.map((p) => ({
    label: p.name,
    value: p.name,
  }))

  const selectedProvider = providers.find((p) => p.name === config.provider_tool?.provider_name)
  const toolkitOptions = (selectedProvider?.provided_toolkits ?? []).map((tk) => ({
    label: tk.name,
    value: tk.name,
  }))

  const selectedToolkit = selectedProvider?.provided_toolkits?.find(
    (tk) => tk.name === config.provider_tool?.toolkit_name
  )
  const providerToolOptions = (selectedToolkit?.provided_tools ?? [])
    .filter((t) => t.sync_invocation_supported !== false)
    .map((t) => ({ label: t.name, value: t.name }))

  const selectedProviderTool = selectedToolkit?.provided_tools.find(
    (t) => t.name === config.provider_tool?.tool_name
  )

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(
      e.target.checked
        ? ({
            ...DEFAULT_HEDGING_CONFIG,
            provider_tool: { ...DEFAULT_PROVIDER_TOOL },
          } as HedgingConfigType)
        : null
    )
  }

  const handleModeChange = (mode: 'internal' | 'provider') => {
    if (mode === 'provider') {
      onChange({
        ...config,
        tool: null,
        provider_tool: savedProviderToolRef.current ?? { ...DEFAULT_PROVIDER_TOOL },
      })
    } else {
      savedProviderToolRef.current = config.provider_tool
      onChange({
        ...config,
        tool: { name: '' },
        provider_tool: null,
      })
    }
  }

  return (
    <>
      <Switch
        label="Enable Request Hedging"
        value={isEnabled}
        onChange={handleToggle}
        onBlur={onBlur}
      />
      {isEnabled && (
        <>
          <InfoBox>
            When enabled, the assistant races a direct fast-path tool invocation in parallel with
            the full agent pipeline. If the fast tool returns a non-empty result within the timeout,
            the agent is cancelled and the fast response is returned immediately.
          </InfoBox>

          <Tabs
            activeTab={isProviderMode ? 'provider' : 'internal'}
            onChange={handleModeChange}
            alwaysShowTabs
            tabClassName="flex flex-col gap-3 mt-0"
            tabs={[
              {
                id: 'provider',
                label: 'Provider Tool',
                element: (
                  <>
                    <Select
                      label="Provider"
                      placeholder="Select provider"
                      value={config.provider_tool?.provider_name || null}
                      options={providerOptions}
                      onChange={(e) => {
                        onChange({
                          ...config,
                          provider_tool: {
                            provider_name: e.value,
                            toolkit_name: '',
                            tool_name: '',
                          },
                        })
                      }}
                      disabled={providerOptions.length === 0}
                    />
                    <Select
                      label="Toolkit"
                      placeholder="Select toolkit"
                      value={config.provider_tool?.toolkit_name || null}
                      options={toolkitOptions}
                      onChange={(e) => {
                        onChange({
                          ...config,
                          provider_tool: {
                            ...config.provider_tool!,
                            toolkit_name: e.value,
                            tool_name: '',
                          },
                        })
                      }}
                      disabled={!config.provider_tool?.provider_name}
                    />
                    <Select
                      label="Tool"
                      placeholder="Select tool"
                      value={config.provider_tool?.tool_name || null}
                      options={providerToolOptions}
                      onChange={(e) => {
                        const selectedTool = selectedToolkit?.provided_tools.find(
                          (t) => t.name === e.value
                        )
                        const prefilledMapping = Object.fromEntries(
                          Object.keys(selectedTool?.args_schema ?? {}).map((k) => [k, `{{${k}}}`])
                        )
                        onChange({
                          ...config,
                          provider_tool: {
                            ...config.provider_tool!,
                            tool_name: e.value,
                          },
                          input_mapping: prefilledMapping,
                        })
                      }}
                      disabled={!config.provider_tool?.toolkit_name}
                    />
                    <Select
                      label="Datasource"
                      placeholder="Select datasource"
                      hint="Required for datasource-backed tools. Select the provider datasource configured for this project and for this provider tool."
                      value={config.provider_tool?.datasource_name || null}
                      options={providerDatasources.map((ds) => ({
                        value: ds.name,
                        label: ds.name,
                      }))}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          provider_tool: {
                            ...config.provider_tool!,
                            datasource_name: e.value || null,
                          },
                        })
                      }
                    />
                    <Input
                      label="Output Field"
                      placeholder="e.g. results.0.content"
                      value={config.output_field ?? ''}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          output_field: e.target.value || null,
                        })
                      }
                    />
                    <Input
                      label="Result Condition"
                      placeholder="e.g. empty == false"
                      hint={
                        'Optional Python boolean expression evaluated against the raw result dict returned by the provider tool. Dict keys are exposed as top-level variables (e.g. status, data). Use subscript notation for nested values: data["user_id"] — dot notation is not supported. JSON aliases: false, true, null map to Python False, True, None. If empty, any non-null result is accepted.'
                      }
                      value={config.provider_tool?.result_condition ?? ''}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          provider_tool: {
                            ...config.provider_tool!,
                            result_condition: e.target.value || null,
                          },
                        })
                      }
                    />
                    <Input
                      label="Timeout (ms)"
                      type="number"
                      value={String(config.timeout_ms)}
                      onChange={(e) =>
                        onChange({
                          ...config,
                          timeout_ms: Number(e.target.value),
                        })
                      }
                      error={timeoutError}
                    />
                    <InputMappingField
                      key={config.provider_tool?.tool_name ?? ''}
                      value={config.input_mapping ?? {}}
                      onChange={(mapping) => onChange({ ...config, input_mapping: mapping })}
                      argsSchema={selectedProviderTool?.args_schema}
                    />
                  </>
                ),
              },
              {
                id: 'internal',
                label: 'Internal Tool',
                element: (
                  <>
                    <Select
                      label="Fast Tool"
                      placeholder="Select a hedgeable tool"
                      value={config.tool?.name || null}
                      options={toolOptions}
                      onChange={(e) => {
                        onChange({ ...config, tool: { name: e.value } })
                      }}
                      disabled={toolOptions.length === 0}
                      error={toolError}
                    />
                    {toolOptions.length === 0 && (
                      <p className="text-xs text-text-tertiary">
                        No hedgeable tools are available.
                      </p>
                    )}
                  </>
                ),
              },
            ]}
          />
        </>
      )}
    </>
  )
}

export default HedgingConfig
