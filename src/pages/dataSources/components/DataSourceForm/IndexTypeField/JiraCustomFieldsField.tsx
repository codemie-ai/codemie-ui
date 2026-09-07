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

import { FC, useEffect, useMemo, useState } from 'react'
import { Control, Controller, FieldErrors, useWatch } from 'react-hook-form'

import MultiSelect, { MultiSelectOptionType } from '@/components/form/MultiSelect/MultiSelect'
import { dataSourceStore } from '@/store/dataSources'
import { JiraFieldOption } from '@/types/entity/dataSource'

import { FormValues } from '../hooks/useEditPopupForm'

interface Props {
  control: Control<FormValues>
  errors: FieldErrors<FormValues>
  projectName: string
  // Jira integrations available in the selected project — used to ignore a stale
  // setting_id left in the form after switching to a project without that integration
  availableSettings: Array<{ id: string }>
}

interface FieldOption {
  label: string
  value: string
  fieldName: string
}

const CUSTOM_FIELDS_LABEL = 'Custom fields (optional)'
const CUSTOM_FIELDS_HINT =
  'Additional Jira fields to index alongside the default ones. ' +
  'Search by field name or ID (e.g. customfield_10001).'

const renderFieldOption = (option: FieldOption) => (
  <p className="text-sm font-medium truncate" title={option.label}>
    {option.fieldName} <span className="text-text-secondary opacity-60">{option.value}</span>
  </p>
)

// Built at module scope so the chip renderer is never a component defined inside the parent
const renderSelectedItem = (nameById: Map<string, string>) => (value: string) =>
  <span title={value}>{nameById.get(value) ?? value}</span>

/**
 * Custom fields picker for the Jira datasource form.
 *
 * Fetches the available fields from the selected Jira integration and offers them in a
 * searchable multi-select (searchable by both field name and field ID — the filter matches
 * the full option label). The list reloads whenever the selected integration changes, since
 * different integrations may point to different Jira instances. While no integration is
 * selected (or the fetch fails) the dropdown stays visible but empty — the backend validates
 * the final values on submit either way.
 */
const JiraCustomFieldsField: FC<Props> = ({ control, errors, projectName, availableSettings }) => {
  const rawSettingId = useWatch({ control, name: 'setting_id' })
  // The form keeps setting_id across project switches; only honor it while it points
  // to an integration that exists in the currently selected project.
  const settingId = availableSettings.some((setting) => setting.id === rawSettingId)
    ? rawSettingId
    : undefined
  const [fields, setFields] = useState<JiraFieldOption[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchFailed, setFetchFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    setFields(null)
    setFetchFailed(false)

    if (projectName && settingId) {
      setLoading(true)
      dataSourceStore
        .getJiraFields(projectName, settingId)
        .then((result) => {
          if (!cancelled) setFields(result)
        })
        .catch(() => {
          if (!cancelled) setFetchFailed(true)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    return () => {
      cancelled = true
    }
  }, [projectName, settingId])

  const options = useMemo<FieldOption[]>(() => {
    if (!fields) return []
    // Label carries both name and ID so the dropdown filter matches either
    return fields.map((field) => ({
      label: `${field.name} (${field.id})`,
      value: field.id,
      fieldName: field.name,
    }))
  }, [fields])

  const nameById = useMemo(() => {
    const map = new Map<string, string>()
    options.forEach((option) => map.set(option.value, option.fieldName))
    return map
  }, [options])

  const placeholder = settingId ? 'Select custom fields' : 'Select an integration to load fields'
  const fetchError = fetchFailed
    ? 'Failed to load fields from Jira. Please verify the integration settings.'
    : undefined

  return (
    <Controller
      name="jiraCustomFields"
      control={control}
      render={({ field }) => {
        const selected = (field.value ?? []).filter((v): v is string => !!v)

        // Keep values not present in the fetched list (e.g. stored under an old name or
        // typed before the list loaded) visible as options instead of silently dropping them.
        const extraOptions = selected
          .filter((value) => !nameById.has(value))
          .map((value) => ({ label: value, value, fieldName: value }))

        return (
          <MultiSelect
            id="jiraCustomFields"
            name={field.name}
            className="mb-3"
            label={CUSTOM_FIELDS_LABEL}
            hint={CUSTOM_FIELDS_HINT}
            placeholder={placeholder}
            value={selected}
            options={[...options, ...extraOptions] as unknown as MultiSelectOptionType[]}
            onChange={(e) => field.onChange(e.value ?? [])}
            // Filtering is client-side; a handler only has to exist to enable the search box
            onFilter={() => {}}
            loading={loading}
            showCheckbox
            display="chip"
            fullWidth
            hasVirtualScroll
            renderOption={renderFieldOption}
            selectedItemTemplate={renderSelectedItem(nameById)}
            emptyFilterMessage="No matching fields"
            error={errors.jiraCustomFields?.message ?? fetchError}
          />
        )
      }}
    />
  )
}

export default JiraCustomFieldsField
