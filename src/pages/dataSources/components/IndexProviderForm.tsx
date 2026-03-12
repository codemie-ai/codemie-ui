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

import React, { useEffect, useMemo, useCallback } from 'react'
import { Controller } from 'react-hook-form'

import CrossIcon from '@/assets/icons/cross.svg?react'
import Autocomplete from '@/components/form/Autocomplete'
import Input from '@/components/form/Input'
import MultiSelect from '@/components/form/MultiSelect'
import Switch from '@/components/form/Switch'
import { MASKED_VALUE } from '@/constants/settings'
import { DataProvider, DataProviderField } from '@/types/entity/dataSource'
import { humanize } from '@/utils/helpers'

import {
  BASE_SCHEMA_KEY,
  CREATE_SCHEMA_KEY,
  PROVIDER_FIELD_TYPES,
  PROVIDER_STRINGISH_TYPES,
  PROVIDER_SKIPPED_FIELDS,
} from '../constants'

interface Props {
  dataProvider: DataProvider
  values: {
    base_params?: Record<string, any>
    create_params?: Record<string, any>
  }
  projectName: string
  control: any
  errors: Record<string, any>
  setValue?: (name: string, value: any, options?: any) => void
}

const IndexProviderForm: React.FC<Props> = ({
  values,
  dataProvider,
  projectName,
  control,
  errors,
  setValue,
}) => {
  const PROJECT_NAME_KEY = 'project_name'
  const fields = useMemo((): DataProviderField[] => {
    const baseSchema = dataProvider[BASE_SCHEMA_KEY]?.parameters ?? []
    const actionSchema = dataProvider[CREATE_SCHEMA_KEY]?.parameters ?? []
    return [...baseSchema, ...actionSchema]
  }, [dataProvider])

  const selectInitialValues = useMemo(() => {
    const fieldsWithEnums = fields.filter(
      (field) => field.enum && field.parameter_type === PROVIDER_FIELD_TYPES.LIST
    )

    return fieldsWithEnums.reduce((acc, field) => {
      ;[acc[field.name]] = field.enum ?? []
      return acc
    }, {} as Record<string, any>)
  }, [fields])

  const isSensitive = useCallback(
    (key: string) => {
      const config = fields.find((field) => field.name === key)
      return config?.parameter_type === PROVIDER_FIELD_TYPES.SECRET
    },
    [fields]
  )

  const initialValues = useMemo(() => {
    if (!values) return selectInitialValues

    const { base_params: baseParams = {}, create_params: createParams = {} } = values

    const mergedValues = {
      ...selectInitialValues,
      ...baseParams,
      ...createParams,
    }

    Object.keys(mergedValues).forEach((key) => {
      if (Array.isArray(mergedValues[key])) {
        ;[mergedValues[key]] = mergedValues[key]
      }
      if (isSensitive(key)) {
        mergedValues[key] = MASKED_VALUE
      }
    })

    return mergedValues
  }, [values, selectInitialValues, isSensitive])

  const buildSelectOptions = useCallback((field: DataProviderField) => {
    if (!field.enum) return []
    return field.enum.map((item) => ({
      value: item,
      label: humanize(item),
    }))
  }, [])

  const filterMultiselectOptions = (options, currentValue, fieldName) => {
    if (!options.length || !(PROJECT_NAME_KEY in options[0])) return options

    // If multiselect is dependand of project name - filter and reset if needed
    const filteredOptions = options.filter((item) => item.project_name === projectName)
    const optionValues = filteredOptions.map((option) => option.value)
    const resetValue = !currentValue?.every((value) => optionValues.includes(value))
    if (resetValue) setValue?.(fieldName, [])
    return filteredOptions
  }

  useEffect(() => {
    fields.forEach((field) => {
      if (initialValues[field.name] !== undefined && setValue) {
        setValue(field.name, initialValues[field.name], { shouldValidate: true })
      }
    })
  }, [fields, initialValues, setValue])

  return (
    <div className="mb-3">
      {fields.map((field, index) => {
        if (PROVIDER_SKIPPED_FIELDS.includes(field.name)) {
          return <></>
        }

        if (PROVIDER_STRINGISH_TYPES.includes(field.parameter_type)) {
          return (
            <div key={`${index}-${field.name}`} className="mt-3">
              <Controller
                name={field.name}
                control={control}
                render={({ field: controllerField }) => (
                  <Input
                    id={field.name}
                    {...controllerField}
                    name={field.name}
                    error={errors[field.name]?.message as string}
                    label={field.title ?? humanize(field.name)}
                    placeholder={field.example ?? humanize(field.name)}
                    hint={field.description}
                    type={isSensitive(field.name) ? 'password' : ''}
                    required={field.required}
                  />
                )}
              />
            </div>
          )
        }

        if (field.parameter_type === PROVIDER_FIELD_TYPES.LIST) {
          const options = buildSelectOptions(field)

          return (
            <div key={`${index}-${field.name}`} className="mt-3">
              <Controller
                name={field.name}
                control={control}
                render={({ field: controllerField }) => (
                  <Autocomplete
                    id={field.name}
                    {...controllerField}
                    options={options}
                    label={field.title ?? humanize(field.name)}
                    placeholder={field.example ?? undefined}
                    hint={field.description}
                  />
                )}
              />
            </div>
          )
        }

        if (field.parameter_type === PROVIDER_FIELD_TYPES.BOOLEAN) {
          return (
            <div key={`${index}-${field.name}`} className="mt-3">
              <Controller
                name={field.name}
                control={control}
                render={({ field: controllerField }) => (
                  <Switch
                    id={field.name}
                    {...controllerField}
                    label={field.title ?? humanize(field.name)}
                  />
                )}
              />
            </div>
          )
        }

        if (field.parameter_type === PROVIDER_FIELD_TYPES.MULTISELECT) {
          return (
            <div key={`${index}-${field.name}`} className="mt-3">
              <Controller
                name={field.name}
                control={control}
                render={({ field: controllerField, fieldState }) => (
                  <div className="relative">
                    <MultiSelect
                      showCheckbox
                      id={field.name}
                      {...controllerField}
                      options={filterMultiselectOptions(
                        field.multiselect_options,
                        controllerField.value,
                        field.name
                      )}
                      label={field.title ?? humanize(field.name)}
                      onChange={(e) => setValue?.(field.name, e.value)}
                      placeholder={field.example ?? humanize(field.name)}
                      error={fieldState.error?.message}
                      scrollHeight="500px"
                      required
                    />

                    {controllerField.value && (
                      <div className="multiselect-clear !top-[35px]">
                        <CrossIcon onClick={() => setValue?.(field.name, null)} />
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          )
        }

        return (
          <div key={`${index}-${field.name}`} className="text-sm mt-3">
            Field <i>{field.name}</i> of type <i>{field.parameter_type}</i> is not supported 😿
          </div>
        )
      })}
    </div>
  )
}

export default IndexProviderForm
