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

import { useEffect, useMemo, useState } from 'react'

import { VersionedFieldOption } from '@/components/form/VersionedField/VersionedFieldHistoryTab'
import { WorkflowConfigHistoryItem } from '@/types/entity/workflow'
import { createdBy, formatDateTime } from '@/utils/helpers'

export const VERSION_HISTORY_EMPTY_PLACEHOLDER = 'No version history available'
export const VERSION_HISTORY_HEADER = 'Version History'

const optionValue = (entry: WorkflowConfigHistoryItem, index: number) => `${entry.date}::${index}`

export function useWorkflowVersionHistorySelection(
  visible: boolean,
  history: WorkflowConfigHistoryItem[]
) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null)

  const options: VersionedFieldOption[] = useMemo(
    () =>
      history.map((entry, index) => {
        const versionNumber = history.length - index
        return {
          label: `[${String(versionNumber).padStart(2, '0')}] - ${formatDateTime(
            entry.date,
            'short'
          )} - ${createdBy(entry.created_by)}`,
          value: optionValue(entry, index),
        }
      }),
    [history]
  )

  const selectedIndex = useMemo(() => {
    if (!selectedValue) return -1
    return history.findIndex((entry, index) => optionValue(entry, index) === selectedValue)
  }, [history, selectedValue])

  const selectedEntry = selectedIndex >= 0 ? history[selectedIndex] : null
  const previousEntry = selectedIndex >= 0 ? history[selectedIndex + 1] : undefined

  useEffect(() => {
    if (!visible || history.length === 0) {
      setSelectedValue(null)
      return
    }
    const stillValid = history.some((entry, index) => optionValue(entry, index) === selectedValue)
    if (!stillValid) {
      setSelectedValue(optionValue(history[0], 0))
    }
  }, [visible, history, selectedValue])

  return {
    options,
    selectedValue,
    setSelectedValue,
    selectedIndex,
    selectedEntry,
    previousEntry,
    optionValue,
  }
}
