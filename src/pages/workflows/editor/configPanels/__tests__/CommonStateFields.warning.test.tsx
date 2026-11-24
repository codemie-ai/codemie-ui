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
import React from 'react'
import { describe, it, expect, vi } from 'vitest'

import { WorkflowContext } from '../../hooks/useWorkflowContext'
import CommonStateFields from '../CommonStateFields'

vi.mock('../../utils/visualEditorFieldRegistry', () => ({ registerFields: vi.fn() }))
vi.mock('../components/ConfigAccordion', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const WARNING_TEXT = 'task may be missing'

// Returns a WARNING only for the requested path; every other field has no issue.
const contextFor = (warnedPath: string) =>
  ({
    selectedStateId: 's',
    issues: [],
    activeIssue: null,
    setActiveIssue: vi.fn(),
    markIssueDirty: vi.fn(),
    getMcpIssue: vi.fn(),
    getIssueField: (path: string) =>
      path === warnedPath
        ? {
            ref: () => {},
            fieldWarning: WARNING_TEXT,
            issue: { id: 'w1', path, outcome: 'WARNING' },
            onChange: () => {},
          }
        : { ref: () => {}, onChange: () => {} },
  } as never)

const renderWith = (warnedPath: string) =>
  render(
    <WorkflowContext.Provider value={contextFor(warnedPath)}>
      <CommonStateFields state={{ id: 's' }} contractFields="full" />
    </WorkflowContext.Provider>
  )

describe('CommonStateFields — contract warnings on text fields', () => {
  it('shows the warning text and the amber outline on the Task field', () => {
    renderWith('task')

    expect(screen.getByText(WARNING_TEXT)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Describe the task for this node')).toHaveClass(
      'border-aborted-secondary'
    )
  })

  it('shows the warning text and the amber outline on the Output Schema field', () => {
    renderWith('output_schema')

    expect(screen.getByText(WARNING_TEXT)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toHaveClass(
      'border-aborted-secondary'
    )
  })
})
