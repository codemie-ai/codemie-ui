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

import { MASKED_VALUE } from '@/constants/settings'
import { humanize } from '@/utils/helpers'
import { cn } from '@/utils/utils'

interface ProviderFields {
  base_params?: Record<string, unknown>
  create_params?: Record<string, unknown>
}

interface DataSourceDetailsProviderProps {
  providerFields: ProviderFields
  titleStyles: string
  propertyLabelStyles: string
  propertyTagStyles: string
}

const DataSourceDetailsProvider: React.FC<DataSourceDetailsProviderProps> = ({
  providerFields,
  titleStyles,
  propertyLabelStyles,
  propertyTagStyles,
}) => {
  const fields: Record<string, unknown> = {
    ...providerFields?.base_params,
    ...providerFields?.create_params,
  }

  // Provider params are not guaranteed to be strings: numbers, booleans and nested
  // objects all appear depending on the data source type.
  const stringify = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)

    // Arrays and nested objects. provider_fields is deserialized JSON, so string,
    // number, boolean, null, array and object are the only shapes that reach here.
    return JSON.stringify(value)
  }

  // Mask b64 encoded values
  const getValue = (value: unknown) => {
    const stringValue = stringify(value)
    if (!stringValue.endsWith('=')) return stringValue

    try {
      return btoa(atob(stringValue)) === stringValue ? MASKED_VALUE : stringValue
    } catch {
      return stringValue
    }
  }

  const renderArrayValue = (values: Array<unknown>) => {
    return values.map((value, index) => {
      return (
        <div
          className={cn(propertyTagStyles, 'max-w-96 overflow-hidden text-left mr-1')}
          key={`${stringify(value).slice(-10)}_-${index}`}
        >
          {getValue(value)}
        </div>
      )
    })
  }

  const renderSingleValue = (value: unknown) => {
    return (
      <div className={cn(propertyTagStyles, 'max-w-96 overflow-hidden text-left')}>
        {getValue(value)}
      </div>
    )
  }

  return (
    <div>
      <h5 className={titleStyles}>Details</h5>
      {Object.keys(fields).map((key, index) => {
        return (
          <div key={`${index}_${key}`} className="flex mb-2 text-xs">
            <div className={cn(propertyLabelStyles, 'min-w-64 w-64 mr-1 text-left')}>
              {humanize(key)}:
            </div>

            <div className="flex flex-col">
              {Array.isArray(fields[key])
                ? renderArrayValue(fields[key])
                : renderSingleValue(fields[key])}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DataSourceDetailsProvider
