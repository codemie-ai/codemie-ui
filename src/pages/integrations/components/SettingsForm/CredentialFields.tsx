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

import React, { useState, useEffect, useRef } from 'react'
import { Control, Controller, useWatch, useFormState } from 'react-hook-form'

import ExternalSvg from '@/assets/icons/external.svg?react'
import PasswordToggleButton from '@/authentication/components/PasswordToggleButton'
import Autocomplete from '@/components/form/Autocomplete'
import Input from '@/components/form/Input'
import InputCopy from '@/components/form/InputCopy/InputCopy'
import MultiSelect from '@/components/form/MultiSelect/MultiSelect'
import Switch from '@/components/form/Switch'
import Textarea from '@/components/form/Textarea'
import Link from '@/components/Link'
import InfoMessage from '@/components/Message/Message'
import ConfigAccordion from '@/pages/workflows/editor/configPanels/components/ConfigAccordion'
import {
  CredentialComponentType,
  CredentialComponentPosition,
  CredentialFieldConfig,
} from '@/types/settingsUI'

import { useResourceOptions } from './hooks/useResourceOptions'
import MultiSelectCheckboxGroup from './MultiSelectCheckboxGroup'
import SettingFormMessage from '../SettingFormMessage/SettingFormMessage'

type AccordionGroup = {
  kind: 'accordion'
  key: string
  title: string
  entries: [string, CredentialFieldConfig][]
}
type RowGroup = { kind: 'row'; entries: [string, CredentialFieldConfig][] }

function groupByRow(
  entries: [string, CredentialFieldConfig][]
): [string, CredentialFieldConfig][][] {
  const rows: [string, CredentialFieldConfig][][] = []
  let i = 0
  while (i < entries.length) {
    const [name, config] = entries[i]
    const rg = config.rowGroup
    if (rg) {
      const group: [string, CredentialFieldConfig][] = [[name, config]]
      i += 1
      while (i < entries.length && entries[i][1].rowGroup === rg) {
        group.push(entries[i])
        i += 1
      }
      rows.push(group)
    } else {
      rows.push([[name, config]])
      i += 1
    }
  }
  return rows
}

function buildRenderGroups(
  entries: [string, CredentialFieldConfig][]
): (AccordionGroup | RowGroup)[] {
  const rows = groupByRow(entries)
  const result: (AccordionGroup | RowGroup)[] = []
  let i = 0
  while (i < rows.length) {
    const row = rows[i]
    const [name, config] = row[0]
    if (config.type === CredentialComponentType.sectionHeader && config.collapsible) {
      const group: AccordionGroup = {
        kind: 'accordion',
        key: name,
        title: config.accordionTitle ?? (typeof config.label === 'string' ? config.label : ''),
        entries: [],
      }
      i += 1
      while (i < rows.length && rows[i][0][1].type !== CredentialComponentType.sectionHeader) {
        group.entries.push(...rows[i])
        i += 1
      }
      result.push(group)
    } else {
      result.push({ kind: 'row', entries: row })
      i += 1
    }
  }
  return result
}

interface CredentialFieldsProps {
  control: Control
  credentialFields: Record<string, CredentialFieldConfig>
  buildWebhookURL?: (value: string) => string
  position?: CredentialComponentPosition
  editing?: boolean
  resetKey?: React.Key
  onManualFieldEdit?: (name: string) => void
  project?: string
}

const CredentialFields: React.FC<CredentialFieldsProps> = ({
  control,
  credentialFields,
  buildWebhookURL,
  position = CredentialComponentPosition.fieldsSection,
  editing = false,
  resetKey,
  onManualFieldEdit,
  project,
}) => {
  const formValues = useWatch({ control })
  const formState = useFormState({ control })
  const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({})
  const resourceType = String(formValues.resource_type ?? '')

  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchFilter = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setDebouncedSearch('')
  }, [resourceType, project])

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    []
  )

  const { options: resourceOptions, loading: resourceLoading } = useResourceOptions(
    resourceType,
    project,
    debouncedSearch
  )

  const togglePasswordVisibility = (fieldName: string) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }))
  }

  const getPlaceholder = (placeholder: any) => {
    if (typeof placeholder === 'function') {
      return placeholder(formValues)
    }
    return placeholder
  }

  const getLabel = (placeholder: any) => {
    const text = getPlaceholder(placeholder)
    const label = text.split(',')[0].split('(')[0].split('e.g.')[0].trim()
    return label.replace('Optional field', '').trim()
  }

  const renderEntry = (name: string, config: CredentialFieldConfig) => {
    const {
      label,
      placeholder,
      type = CredentialComponentType.input,
      options = [],
      help,
      note,
      shouldShow,
      sensitive,
      rows,
      position: fieldPosition = CredentialComponentPosition.fieldsSection,
      message,
      emptySelectionError,
      autoComplete,
    } = config

    if (fieldPosition !== position) return null
    if (shouldShow && !shouldShow(formValues)) return null

    if (type === CredentialComponentType.message && message) {
      return <SettingFormMessage key={name} message={message} />
    }

    if (type === CredentialComponentType.sectionHeader) {
      const heading = getPlaceholder(label)
      return (
        <div key={name} className="mt-2">
          <hr className="opacity-25 mb-3 border-border-structural" />
          {heading && <h5 className="text-sm font-medium">{heading}</h5>}
        </div>
      )
    }

    if (type === CredentialComponentType.webhookUrl) {
      if (!buildWebhookURL) return null
      const urlLabel = typeof label === 'string' ? label : ''
      return (
        <div key={name} className="flex flex-col gap-1">
          {urlLabel && <label className="text-sm font-medium">{urlLabel}</label>}
          <InputCopy
            text={buildWebhookURL(String(formValues.webhook_id ?? ''))}
            notification="Webhook URL copied"
          />
        </div>
      )
    }

    return (
      <Controller
        key={name}
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          const { value } = field
          const error = fieldState.error?.message

          return (
            <div key={name} className="flex flex-col gap-2">
              {type === CredentialComponentType.switch && (
                <Switch
                  id={name}
                  value={value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  label={getPlaceholder(placeholder)}
                />
              )}

              {type === CredentialComponentType.input && (
                <Input
                  id={name}
                  name={name}
                  value={value}
                  error={error}
                  placeholder={getPlaceholder(placeholder)}
                  label={getLabel(label ?? placeholder)}
                  sensitive={sensitive}
                  showPassword={passwordVisibility[name] || false}
                  onChange={(e) => {
                    onManualFieldEdit?.(name)
                    field.onChange(e.target.value)
                  }}
                  autoComplete={autoComplete}
                  labelContent={
                    help &&
                    !sensitive && (
                      <Link
                        url={help}
                        label="Need help?"
                        variant="dimmed"
                        className="text-xs flex gap-2 items-center ml-auto w-fit"
                      >
                        Need help?
                        <ExternalSvg className="opacity-70" />
                      </Link>
                    )
                  }
                >
                  {sensitive && (!editing || formState.dirtyFields[name]) && (
                    <PasswordToggleButton
                      showPassword={passwordVisibility[name] || false}
                      onToggle={() => togglePasswordVisibility(name)}
                      className="right-3"
                    />
                  )}
                </Input>
              )}

              {type === CredentialComponentType.textarea && (
                <Textarea
                  id={name}
                  name={name}
                  value={value}
                  error={error}
                  placeholder={getPlaceholder(placeholder)}
                  label={getLabel(placeholder)}
                  sensitive={sensitive}
                  rows={rows}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  {help && (
                    <div className="flex items-center gap-1">
                      <Link url={help} label="Need help?" className="text-xs">
                        <ExternalSvg className="opacity-70" />
                      </Link>
                    </div>
                  )}
                </Textarea>
              )}

              {type === CredentialComponentType.select && (
                <Autocomplete
                  id={name}
                  name={name}
                  value={value}
                  error={error}
                  placeholder={getPlaceholder(placeholder)}
                  label={getLabel(placeholder)}
                  options={options}
                  onChange={field.onChange}
                />
              )}

              {type === CredentialComponentType.multiselect && (
                <MultiSelectCheckboxGroup
                  name={name}
                  label={label ? getPlaceholder(label) : undefined}
                  options={options}
                  value={value}
                  error={error}
                  emptySelectionError={emptySelectionError}
                  resetKey={resetKey}
                  onChange={field.onChange}
                />
              )}

              {type === CredentialComponentType.resourceSelect && (
                <MultiSelect
                  id={name}
                  label={typeof label === 'string' ? label : 'Resource'}
                  options={resourceOptions}
                  disabled={!resourceType || resourceLoading}
                  loading={resourceLoading}
                  singleValue
                  filterPlaceholder="Search…"
                  onFilter={handleSearchFilter}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange((e.target.value as string) ?? null)}
                />
              )}

              {note && <InfoMessage>{note}</InfoMessage>}
            </div>
          )
        }}
      />
    )
  }

  const entriesByPosition = Object.entries(credentialFields).filter(([, config]) => {
    const fieldPos = config.position ?? CredentialComponentPosition.fieldsSection
    return fieldPos === position
  })

  return (
    <>
      {buildRenderGroups(entriesByPosition).map((group) => {
        if (group.kind === 'accordion') {
          return (
            <ConfigAccordion key={group.key} title={group.title} defaultExpanded={false}>
              <div className="flex flex-col gap-y-4">
                {groupByRow(group.entries).map((row) =>
                  row.length > 1 ? (
                    <div key={row[0][0]} className="flex gap-4 [&>*]:flex-1">
                      {row.map(([n, c]) => renderEntry(n, c))}
                    </div>
                  ) : (
                    renderEntry(row[0][0], row[0][1])
                  )
                )}
              </div>
            </ConfigAccordion>
          )
        }
        return group.entries.length > 1 ? (
          <div key={group.entries[0][0]} className="flex gap-4 [&>*]:flex-1">
            {group.entries.map(([n, c]) => renderEntry(n, c))}
          </div>
        ) : (
          renderEntry(group.entries[0][0], group.entries[0][1])
        )
      })}
    </>
  )
}

export default CredentialFields
