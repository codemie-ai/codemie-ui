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
import { useState } from 'react'

import MultiSelect from '@/components/form/MultiSelect'
import { CustomNodeConfiguration, CustomNodeType } from '@/types/workflowEditor/configuration'

interface CustomNodeSelectorProps {
  customNodeConfig: CustomNodeConfiguration
  onCustomNodeConfigUpdate: (config: CustomNodeConfiguration) => void
  error?: string
}

type CustomNodeOption = {
  label: string
  value: string
}

// Available custom node types
const CUSTOM_NODE_OPTIONS: CustomNodeOption[] = [
  {
    label: 'Generate Document Tree',
    value: CustomNodeType.GENERATE_DOCUMENT_TREE,
  },
  {
    label: 'State Processor',
    value: CustomNodeType.STATE_PROCESSOR,
  },
  {
    label: 'Result Finalizer',
    value: CustomNodeType.RESULT_FINALIZER,
  },
  {
    label: 'Supervisor',
    value: CustomNodeType.SUPERVISOR,
  },
  {
    label: 'Summarize Conversation',
    value: CustomNodeType.SUMMARIZE_CONVERSATION,
  },
]

const CustomNodeSelector = ({
  customNodeConfig,
  onCustomNodeConfigUpdate,
  error,
}: CustomNodeSelectorProps) => {
  const [customNodeOptions] = useState<CustomNodeOption[]>(CUSTOM_NODE_OPTIONS)

  const handleChange = (e: MultiSelectChangeEvent) => {
    const customNodeType = e.selectedOption?.value as CustomNodeType
    if (!customNodeType) return

    const updatedConfig: CustomNodeConfiguration = {
      id: customNodeConfig.id,
      custom_node_id: customNodeType,
    }

    onCustomNodeConfigUpdate(updatedConfig)
  }

  return (
    <div>
      <MultiSelect
        id="custom-node-selector"
        name="custom-node-selector"
        size="medium"
        label="Select custom node type:"
        placeholder="Select a custom node type"
        value={customNodeConfig?.custom_node_id || ''}
        options={customNodeOptions}
        onChange={handleChange}
        showCheckbox={false}
        singleValue
        required
        error={error}
      />
    </div>
  )
}

export default CustomNodeSelector
