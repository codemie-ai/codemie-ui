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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CustomNodeConfiguration, CustomNodeType } from '@/types/workflowEditor/configuration'

import CustomNodeForm, { CustomNodeFormRef } from '../CustomNodeForm'

vi.mock('../../../utils/visualEditorFieldRegistry', () => ({ registerFields: vi.fn() }))

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getCustomNodeSchema: vi.fn().mockResolvedValue({ config_schema: {} }),
  },
}))

vi.mock('@/pages/assistants/components/AssistantForm/components/LLMSelector', () => ({
  default: () => <div data-testid="llm-selector" />,
}))

vi.mock('../CustomNodeSelector', () => ({
  default: ({ customNodeConfig, onCustomNodeConfigUpdate }: any) => (
    <button
      data-testid="custom-node-selector"
      onClick={() =>
        onCustomNodeConfigUpdate({
          id: customNodeConfig.id,
          custom_node_id: CustomNodeType.GENERATE_DOCUMENT_TREE,
        })
      }
    >
      {customNodeConfig.custom_node_id}
    </button>
  ),
}))

const customNodeConfig: CustomNodeConfiguration = {
  id: 'custom-1',
  custom_node_id: CustomNodeType.STATE_PROCESSOR,
}

describe('CustomNodeForm — onCustomNodeIdChange', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('reports the current custom_node_id on mount and on change', async () => {
    const onCustomNodeIdChange = vi.fn()
    const ref = createRef<CustomNodeFormRef>()
    render(
      <CustomNodeForm
        ref={ref}
        project="test-project"
        customNodeConfig={customNodeConfig}
        onCustomNodeIdChange={onCustomNodeIdChange}
      />
    )

    expect(onCustomNodeIdChange).toHaveBeenCalledWith(CustomNodeType.STATE_PROCESSOR)

    await user.click(screen.getByTestId('custom-node-selector'))

    expect(onCustomNodeIdChange).toHaveBeenLastCalledWith(CustomNodeType.GENERATE_DOCUMENT_TREE)
  })
})
