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

import { FC, useState } from 'react'
import { useSnapshot } from 'valtio'

import { Checkbox } from '@/components/form/Checkbox'
import { RadioButton } from '@/components/form/RadioButton'
import Popup from '@/components/Popup'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import toaster from '@/utils/toaster'

interface WorkflowExecutionExportPopupProps {
  isVisible: boolean
  onHide: () => void
}

const EXPORT_TYPES = [
  {
    value: 'md',
    label: 'Markdown (.md)',
  },
  {
    value: 'html',
    label: 'HTML (.html)',
  },
]

const WorkflowExecutionExportPopup: FC<WorkflowExecutionExportPopupProps> = ({
  isVisible,
  onHide,
}) => {
  const { workflow, execution } = useSnapshot(
    workflowExecutionsStore
  ) as typeof workflowExecutionsStore

  const [type, setType] = useState('md')
  const [shouldCombine, setShouldCombine] = useState(false)

  const handleExport = async () => {
    if (!workflow || !execution) return

    try {
      await workflowExecutionsStore.exportWorkflowExecution(workflow, execution, {
        output_format: type,
        combined: shouldCombine,
      })
      onHide()
    } catch {
      toaster.error('Failed to export workflow execution.')
    }
  }

  return (
    <Popup
      limitWidth
      visible={isVisible}
      submitText="Export"
      header="Export Workflow Execution"
      onHide={onHide}
      onSubmit={handleExport}
      withBorderBottom={false}
    >
      <h2 className="text-lg mb-2">Output format:</h2>
      <div className="flex mb-7 gap-6">
        {EXPORT_TYPES.map((option) => (
          <RadioButton
            key={option.value}
            inputId={option.value}
            name="exportType"
            value={option.value}
            checked={type === option.value}
            onChange={(e) => setType(e.value)}
            label={option.label}
          />
        ))}
      </div>
      <div className="mb-3">
        <Checkbox
          id="shouldCombine"
          name="shouldCombine"
          checked={shouldCombine}
          onChange={setShouldCombine}
          label="Combine results into one file"
        />
      </div>
    </Popup>
  )
}

export default WorkflowExecutionExportPopup
