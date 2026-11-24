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

// AC4: conditional, switch and iterator are MetaNodeTypes and carry no contract or mode control.

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import ConditionalTab from '../ConditionalTab'
import IteratorTab from '../IteratorTab'
import SwitchTab from '../SwitchTab'
import { INPUT_CONTRACT_PLACEHOLDER, OUTPUT_CONTRACT_PLACEHOLDER } from './contractTestUtils'

vi.mock('../../hooks/useWorkflowContext', () => ({
  useWorkflowContext: vi.fn().mockReturnValue({
    activeIssue: null,
    setActiveIssue: vi.fn(),
    getIssueField: vi.fn().mockReturnValue({
      ref: { current: null },
      fieldError: undefined,
      onChange: vi.fn(),
    }),
    markIssueDirty: vi.fn(),
    removeArrayIssue: vi.fn(),
    issues: [],
  }),
  WorkflowContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}))

const config: WorkflowConfiguration = { states: [{ id: 'meta-1' } as any] }

const props = {
  stateId: 'meta-1',
  config,
  onConfigChange: vi.fn(),
  onClose: vi.fn(),
  onDelete: vi.fn(),
}

describe.each([
  ['ConditionalTab', ConditionalTab],
  ['SwitchTab', SwitchTab],
  ['IteratorTab', IteratorTab],
])('%s — no contract controls (AC4)', (_name, Tab) => {
  it('renders neither contract fields nor the save validation', () => {
    render(<Tab {...(props as any)} />)

    expect(screen.queryByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER)).not.toBeInTheDocument()
    expect(screen.queryByText('Use workflow default')).not.toBeInTheDocument()
    expect(screen.queryByText('Save validation')).not.toBeInTheDocument()
  })
})
