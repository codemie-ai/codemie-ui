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

import { useEffect, useMemo } from 'react'
import { UseFormClearErrors } from 'react-hook-form'
import { useSnapshot } from 'valtio'

import Autocomplete from '@/components/form/Autocomplete'
import { INDEX_TYPES, IndexType } from '@/constants/dataSources'
import { dataSourceStore } from '@/store/dataSources'
import { DataProvider } from '@/types/entity/dataSource'
import { FilterOption } from '@/types/filters'
import { humanize } from '@/utils/helpers'

interface Props {
  clearErrors: UseFormClearErrors<any>
  hidden?: boolean
  indexType: string
  onIndexTypeChange: (val: string) => void
  indexMetadata: Record<string, any>
  onIndexMetadataChange: (dataProvider?: DataProvider) => void
}

const DataSourceTypeSelector = ({
  clearErrors,
  hidden = false,
  indexType,
  onIndexTypeChange,
  onIndexMetadataChange,
}: Props) => {
  const { indexProviderSchemas } = useSnapshot(dataSourceStore) as typeof dataSourceStore

  const indexTypeOptions: {
    label: string
    value: string
    context?: DataProvider
    badge?: string
  }[] = useMemo(() => {
    const baseTypes = Object.keys(INDEX_TYPES)
      .filter((key) => INDEX_TYPES[key] !== INDEX_TYPES.PROVIDER)
      .map((key) => {
        const option = {
          value: INDEX_TYPES[key],
          label: humanize(INDEX_TYPES[key]),
        }

        // Add NEW badge for X-ray and Azure DevOps Work Item types
        if (
          INDEX_TYPES[key] === INDEX_TYPES.XRAY ||
          INDEX_TYPES[key] === INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM
        ) {
          return { ...option, badge: 'NEW' }
        }

        return option
      })

    const providerTypes =
      indexProviderSchemas?.map((item) => ({
        value: item.id,
        context: item,
        label: humanize(item.name),
      })) || []

    return [...baseTypes, ...providerTypes]
  }, [indexProviderSchemas])

  useEffect(() => {
    const updateMetadata = async () => {
      if (!Object.values(INDEX_TYPES).includes(indexType as IndexType)) {
        const dataProvider = indexProviderSchemas?.find((item) => item.id === indexType)
        onIndexMetadataChange(dataProvider)
      } else {
        onIndexMetadataChange()
      }
    }

    clearErrors()
    updateMetadata()
  }, [indexType, indexProviderSchemas, indexTypeOptions, onIndexMetadataChange])

  const itemTemplate = (option: FilterOption) => {
    return (
      <div className="flex items-center gap-2">
        <span>{option.label}</span>
        {option.badge && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-600 text-white leading-none">
            {option.badge}
          </span>
        )}
      </div>
    )
  }

  if (hidden) return null

  return (
    <Autocomplete
      id="indexType"
      label="Choose Datasource Type:"
      name="Datasource Type"
      value={indexType}
      options={indexTypeOptions}
      onChange={onIndexTypeChange}
      itemTemplate={itemTemplate}
    />
  )
}

export default DataSourceTypeSelector
