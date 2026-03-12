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
import { describe, it, expect } from 'vitest'

import WorkflowExecutionDetailsItem from '../WorkflowExecutionDetailsItem'

describe('WorkflowExecutionDetailsItem', () => {
  it('renders with label and value', () => {
    render(<WorkflowExecutionDetailsItem label="Status" value="Running" />)

    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('renders with label and children', () => {
    render(
      <WorkflowExecutionDetailsItem label="Details">
        <span>Custom content</span>
      </WorkflowExecutionDetailsItem>
    )

    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Custom content')).toBeInTheDocument()
  })

  it('renders both children and value when provided', () => {
    render(
      <WorkflowExecutionDetailsItem label="Test" value="Value">
        <span>Child content</span>
      </WorkflowExecutionDetailsItem>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
    expect(screen.getByText('Value')).toBeInTheDocument()
  })

  it('renders with complex ReactNode as value', () => {
    const complexValue = (
      <div>
        <span>Part 1</span>
        <span>Part 2</span>
      </div>
    )

    render(<WorkflowExecutionDetailsItem label="Complex" value={complexValue} />)

    expect(screen.getByText('Part 1')).toBeInTheDocument()
    expect(screen.getByText('Part 2')).toBeInTheDocument()
  })

  it('renders only label when no value or children provided', () => {
    render(<WorkflowExecutionDetailsItem label="Empty" />)

    expect(screen.getByText('Empty')).toBeInTheDocument()
  })
})
