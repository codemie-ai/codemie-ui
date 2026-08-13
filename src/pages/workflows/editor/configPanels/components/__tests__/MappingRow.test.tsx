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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'
import { TransformMappingType } from '@/types/workflowEditor/configuration'

import MappingRow from '../MappingRow'

vi.mock('@/assets/icons/chevron-up.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-up-icon" {...props} />,
}))
vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: (props: any) => <svg data-testid="delete-icon" {...props} />,
}))
vi.mock('@/components/form/Input', () => ({ default: () => null }))
vi.mock('@/components/form/Select', () => ({ default: () => null }))
vi.mock('@/components/form/Textarea', () => ({ default: () => null }))

const workflowContext = {
  selectedStateId: null,
  issues: null,
  activeIssue: null,
  setActiveIssue: vi.fn(),
  getIssueField: vi.fn(() => ({ ref: { current: null }, message: undefined })),
  getToolIssue: vi.fn(),
  getMcpIssue: vi.fn(),
  goToField: vi.fn(),
  isIssueResolved: vi.fn(() => false),
  isIssueDirty: vi.fn(() => false),
  markIssueDirty: vi.fn(),
  clearAllDirtyIssues: vi.fn(),
  clearAllDirtyMcpIssues: vi.fn(),
  resolveAllDirtyIssues: vi.fn(),
  removeArrayIssue: vi.fn(),
  tempIssues: null,
  setIssues: vi.fn(),
  setTempIssues: vi.fn(),
}

const defaultMapping = { output_field: 'result', type: TransformMappingType.EXTRACT }

const renderMappingRow = (propsOverride: any = {}) => {
  const props = {
    mapping: defaultMapping,
    index: 0,
    isExpanded: false,
    onToggle: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    invalid: false,
    ...propsOverride,
  }
  return render(
    <WorkflowContext.Provider value={workflowContext as any}>
      <MappingRow {...props} />
    </WorkflowContext.Provider>
  )
}

describe('MappingRow — toggle button accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the toggle as a button with type="button"', () => {
    renderMappingRow()
    const btn = screen.getByRole('button', { name: /toggle result/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('type', 'button')
  })

  it('toggle button has aria-expanded="false" when collapsed', () => {
    renderMappingRow({ isExpanded: false })
    expect(screen.getByRole('button', { name: /toggle result/i })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('toggle button has aria-expanded="true" when expanded', () => {
    renderMappingRow({ isExpanded: true })
    expect(screen.getByRole('button', { name: /toggle result/i })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
  })

  it('toggle button aria-label uses index fallback when output_field is empty', () => {
    renderMappingRow({
      mapping: { output_field: '', type: TransformMappingType.EXTRACT },
      index: 2,
    })
    expect(screen.getByRole('button', { name: /toggle mapping #3/i })).toBeInTheDocument()
  })

  it('clicking the toggle button calls onToggle', () => {
    const onToggle = vi.fn()
    renderMappingRow({ onToggle })
    fireEvent.click(screen.getByRole('button', { name: /toggle result/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('clicking the delete button calls onDelete and does NOT call onToggle', () => {
    const onToggle = vi.fn()
    const onDelete = vi.fn()
    renderMappingRow({ onToggle, onDelete })
    fireEvent.click(screen.getByRole('button', { name: /delete mapping/i }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('chevron icon has aria-hidden="true"', () => {
    renderMappingRow()
    expect(screen.getByTestId('chevron-up-icon')).toHaveAttribute('aria-hidden', 'true')
  })
})
