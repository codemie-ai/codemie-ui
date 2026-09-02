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

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import VersionedFieldHistoryTab, {
  VersionedFieldOption,
} from '@/components/form/VersionedField/VersionedFieldHistoryTab'
import VersionHistoryDiffView from '@/components/form/VersionedField/VersionHistoryDiffView'
import Popup from '@/components/Popup'
import { WorkflowConfigHistoryItem } from '@/types/entity/workflow'
import { createdBy, formatDateTime } from '@/utils/helpers'

export interface WorkflowVersionHistoryPopupProps {
  visible: boolean
  canWrite: boolean
  currentEditorYaml: string
  history: WorkflowConfigHistoryItem[]
  onHide: () => void
  onRestore: (yamlConfig: string) => void
}

const optionValue = (entry: WorkflowConfigHistoryItem, index: number) => `${entry.date}::${index}`

const WorkflowVersionHistoryPopup = ({
  visible,
  canWrite,
  currentEditorYaml,
  history,
  onHide,
  onRestore,
}: WorkflowVersionHistoryPopupProps) => {
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
    if (!visible) {
      setSelectedValue(null)
      return
    }
    if (history.length === 0) {
      setSelectedValue(null)
      return
    }
    const stillValid = history.some((entry, index) => optionValue(entry, index) === selectedValue)
    if (!stillValid) {
      setSelectedValue(optionValue(history[0], 0))
    }
  }, [visible, history, selectedValue])

  const title = selectedEntry
    ? `${formatDateTime(selectedEntry.date, 'short')} — ${createdBy(selectedEntry.created_by)}`
    : ''

  let diffContent: ReactNode = null
  if (selectedEntry) {
    diffContent = (
      <VersionHistoryDiffView
        key={optionValue(selectedEntry, selectedIndex)}
        historyText={selectedEntry.yaml_config ?? ''}
        currentText={currentEditorYaml}
        previousHistoryText={previousEntry?.yaml_config}
        title={title}
      />
    )
  }

  return (
    <Popup
      hideFooter
      hideClose={false}
      isFullWidth
      visible={visible}
      onHide={onHide}
      className="h-[90vh] pb-6"
      headerContent={<h2 className="text-lg font-semibold">Version History</h2>}
    >
      <div className="flex flex-col gap-3 h-full pt-2">
        <VersionedFieldHistoryTab
          options={options}
          selectedOption={selectedValue}
          emptyPlaceholder="No version history available"
          canRestore={canWrite}
          onRestore={() => {
            if (selectedEntry?.yaml_config != null) onRestore(selectedEntry.yaml_config)
          }}
          onOptionChange={(value) => setSelectedValue(value)}
        >
          {diffContent}
        </VersionedFieldHistoryTab>
      </div>
    </Popup>
  )
}

export default WorkflowVersionHistoryPopup
