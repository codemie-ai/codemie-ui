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

import React, { useState } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import { RadioButton } from '@/components/form/RadioButton'
import Popup from '@/components/Popup'

interface WorkflowExecutionExportPopupProps {
  visible: boolean
  onHide: () => void
  onExport: (options: { type: string; shouldCombine: boolean }) => void
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

const WorkflowExecutionExportPopup: React.FC<WorkflowExecutionExportPopupProps> = ({
  visible,
  onHide,
  onExport,
}) => {
  const [type, setType] = useState('md')
  const [shouldCombine, setShouldCombine] = useState(false)

  const handleSubmit = () => {
    onExport({
      type,
      shouldCombine,
    })
  }

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header="Export Workflow Execution"
      submitText="Export"
      onSubmit={handleSubmit}
    >
      <div className="text-lg mb-2">Output format:</div>
      <div className="flex mb-7 gap-6">
        {EXPORT_TYPES.map((option) => (
          <RadioButton
            key={option.value}
            id={option.value}
            name="exportType"
            value={option.value}
            label={option.label}
            checked={type === option.value}
            onChange={() => setType(option.value)}
          />
        ))}
      </div>
      <div className="mb-3">
        <Checkbox
          id="shouldCombine"
          name="shouldCombine"
          label="Combine results into one file"
          checked={shouldCombine}
          onChange={setShouldCombine}
        />
      </div>
    </Popup>
  )
}

export default WorkflowExecutionExportPopup
