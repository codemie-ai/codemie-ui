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

import { MultiSelectChangeEvent } from 'primereact/multiselect'
import { useCallback, useMemo } from 'react'

interface UseMultiSelectLogicProps {
  value?:
    | string[]
    | string
    | object
    | Record<string, string | { label: string; value: string | number | boolean }>[]
  singleValue?: boolean
  max?: number
  onChange: (e: MultiSelectChangeEvent) => void
}

export const useMultiSelectLogic = ({
  value,
  singleValue,
  max,
  onChange,
}: UseMultiSelectLogicProps) => {
  const preparedValue = useMemo((): Array<
    string | Record<string, string | { label: string; value: string | number | boolean }>
  > => {
    if (value === undefined || value === null) {
      return []
    }
    if (typeof value === 'string') {
      if (value.trim() === '') {
        return []
      }
      return [value]
    }
    if (Array.isArray(value)) {
      return value
    }
    return []
  }, [value])

  const getValue = useCallback(
    (v: string | string[]) => {
      if (singleValue) {
        return Array.isArray(v) ? v[0] : v
      }
      return Array.isArray(v) ? v : [v]
    },
    [singleValue]
  )

  const handleChange = useCallback(
    (e: MultiSelectChangeEvent, selectRef: React.RefObject<{ hide: () => void } | null>) => {
      if (singleValue) {
        selectRef.current?.hide()
      }
      if (singleValue && preparedValue.includes(e.selectedOption.value)) {
        return null
      }

      // Check if max limit is reached and trying to add more items
      if (max !== undefined && Array.isArray(e.value) && e.value.length > max) {
        return null
      }

      const newValue = getValue(e.selectedOption.value)

      return onChange({
        ...e,
        target: {
          ...e.target,
          value: newValue,
        },
      })
    },
    [singleValue, preparedValue, max, getValue, onChange]
  )

  return {
    preparedValue,
    handleChange,
  }
}
