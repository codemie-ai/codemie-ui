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

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { NodeTypes } from '@/types/workflowEditor'

import WorkflowStateIcon from '../WorkflowStateIcon'

vi.mock('@/assets/icons/node-assistant.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-assistant" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-conditional.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-conditional" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-custom.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-custom" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-end.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-end" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-iterator.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-iterator" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-note.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-note" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-start.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-start" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-switch.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-switch" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-tool.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-tool" className={className} />
  ),
}))

vi.mock('@/assets/icons/node-transform.svg?react', () => ({
  default: ({ className }: { className?: string }) => (
    <svg data-testid="icon-transform" className={className} />
  ),
}))

describe('WorkflowStateIcon', () => {
  it('renders assistant icon', () => {
    const { getByTestId } = render(<WorkflowStateIcon type={NodeTypes.ASSISTANT} />)
    expect(getByTestId('icon-assistant')).toBeInTheDocument()
  })

  it('renders conditional icon', () => {
    const { getByTestId } = render(<WorkflowStateIcon type={NodeTypes.CONDITIONAL} />)
    expect(getByTestId('icon-conditional')).toBeInTheDocument()
  })

  it('renders custom icon', () => {
    const { getByTestId } = render(<WorkflowStateIcon type={NodeTypes.CUSTOM} />)
    expect(getByTestId('icon-custom')).toBeInTheDocument()
  })

  it('renders end icon', () => {
    const { getByTestId } = render(<WorkflowStateIcon type={NodeTypes.END} />)
    expect(getByTestId('icon-end')).toBeInTheDocument()
  })

  it('renders start icon', () => {
    const { getByTestId } = render(<WorkflowStateIcon type={NodeTypes.START} />)
    expect(getByTestId('icon-start')).toBeInTheDocument()
  })

  it('renders tool icon', () => {
    const { getByTestId } = render(<WorkflowStateIcon type={NodeTypes.TOOL} />)
    expect(getByTestId('icon-tool')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { getByTestId } = render(
      <WorkflowStateIcon type={NodeTypes.ASSISTANT} className="custom-class" />
    )
    const icon = getByTestId('icon-assistant')
    expect(icon).toHaveClass('custom-class')
  })
})
