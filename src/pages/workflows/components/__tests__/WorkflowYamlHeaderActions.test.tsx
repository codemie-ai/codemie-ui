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

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'

import WorkflowYamlHeaderActions from '../WorkflowYamlHeaderActions'

vi.mock('@/assets/icons/expand.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/history.svg?react', () => ({ default: () => null }))
vi.mock('@/assets/icons/external.svg?react', () => ({ default: () => null }))

afterEach(cleanup)

describe('WorkflowYamlHeaderActions expand button', () => {
  it('does not render the Expand button when onExpand is not provided', () => {
    render(<WorkflowYamlHeaderActions onShowVersionHistory={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Expand YAML editor' })).not.toBeInTheDocument()
  })

  it('renders the Expand button after Version History and calls onExpand once on click', () => {
    const onExpand = vi.fn()
    render(
      <WorkflowYamlHeaderActions
        showDocumentation
        documentationUrl="https://docs.example.com"
        onShowVersionHistory={vi.fn()}
        onExpand={onExpand}
      />
    )

    const buttons = screen.getAllByRole('button')
    const versionHistoryIndex = buttons.findIndex(
      (b) => b.getAttribute('aria-label') === 'Version History'
    )
    const expandButton = screen.getByRole('button', { name: 'Expand YAML editor' })
    expect(buttons.indexOf(expandButton)).toBeGreaterThan(versionHistoryIndex)
    expect(versionHistoryIndex).toBeGreaterThanOrEqual(0)
    expect(expandButton).toHaveTextContent('Expand')

    fireEvent.click(expandButton)
    expect(onExpand).toHaveBeenCalledTimes(1)
  })

  it('still renders the Documentation and Version History buttons', () => {
    render(
      <WorkflowYamlHeaderActions
        showDocumentation
        documentationUrl="https://docs.example.com"
        onShowVersionHistory={vi.fn()}
        onExpand={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /Documentation/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Version History' })).toBeInTheDocument()
  })

  it('uses a custom expand aria label when provided', () => {
    render(<WorkflowYamlHeaderActions onExpand={vi.fn()} expandAriaLabel="Expand config" />)

    expect(screen.getByRole('button', { name: 'Expand config' })).toBeInTheDocument()
  })
})

describe('WorkflowYamlHeaderActions layout', () => {
  it('lets the buttons wrap instead of overflowing a narrow panel', () => {
    render(
      <WorkflowYamlHeaderActions
        showDocumentation
        documentationUrl="https://docs.example.com"
        onShowVersionHistory={vi.fn()}
        onExpand={vi.fn()}
      />
    )

    const container = screen.getByRole('button', { name: 'Expand YAML editor' }).parentElement!
    expect(container).toHaveClass('flex-wrap', 'justify-end', 'min-w-0')
    expect(container).not.toHaveClass('shrink-0')
  })

  it('lets the caller override the alignment through className', () => {
    render(<WorkflowYamlHeaderActions onExpand={vi.fn()} className="ml-0 justify-start" />)

    const container = screen.getByRole('button', { name: 'Expand YAML editor' }).parentElement!
    expect(container).toHaveClass('ml-0', 'justify-start', 'flex-wrap')
    expect(container).not.toHaveClass('ml-auto')
    expect(container).not.toHaveClass('justify-end')
  })
})
