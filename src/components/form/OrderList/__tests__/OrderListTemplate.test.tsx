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

import OrderListTemplate from '../OrderListTemplate'

const renderComponent = (props: Partial<React.ComponentProps<typeof OrderListTemplate>> = {}) => {
  return render(<OrderListTemplate {...props} />)
}

describe('OrderListTemplate', () => {
  it('renders with name only', () => {
    renderComponent({ name: 'Test Item' })

    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  it('renders with name and description', () => {
    renderComponent({
      name: 'Test Item',
      description: 'This is a description',
    })

    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText('This is a description')).toBeInTheDocument()
  })

  it('renders hamburger icon', () => {
    const { container } = renderComponent({ name: 'Test Item' })

    const hamburgerIcon = container.querySelector('svg')
    expect(hamburgerIcon).toBeInTheDocument()
  })

  it('renders custom children', () => {
    renderComponent({
      name: 'Test Item',
      children: <span data-testid="custom-content">Custom Content</span>,
    })

    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
  })

  it('renders actions', () => {
    renderComponent({
      name: 'Test Item',
      actions: <button data-testid="action-button">Edit</button>,
    })

    expect(screen.getByTestId('action-button')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const customClass = 'custom-template-class'
    const { container } = renderComponent({
      name: 'Test Item',
      className: customClass,
    })

    const rootElement = container.firstChild as HTMLElement
    expect(rootElement).toHaveClass(customClass)
  })

  it('applies default styling classes', () => {
    const { container } = renderComponent({ name: 'Test Item' })

    const rootElement = container.firstChild as HTMLElement
    expect(rootElement).toHaveClass(
      'group/item',
      'border',
      'rounded-lg',
      'bg-surface-base-primary',
      'border-border-primary',
      'cursor-grab'
    )
  })

  it('renders without name and description', () => {
    const { container } = renderComponent()

    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders all sections together', () => {
    renderComponent({
      name: 'Test Item',
      description: 'Description text',
      children: <span data-testid="children">Children</span>,
      actions: <button data-testid="actions">Actions</button>,
    })

    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText('Description text')).toBeInTheDocument()
    expect(screen.getByTestId('children')).toBeInTheDocument()
    expect(screen.getByTestId('actions')).toBeInTheDocument()
  })

  it('truncates long name text', () => {
    renderComponent({ name: 'Very Long Name That Should Be Truncated' })

    const nameElement = screen.getByText('Very Long Name That Should Be Truncated')
    expect(nameElement).toHaveClass('truncate')
  })

  it('truncates long description text', () => {
    renderComponent({
      name: 'Test',
      description: 'Very long description that should be truncated',
    })

    const descriptionElement = screen.getByText('Very long description that should be truncated')
    expect(descriptionElement).toHaveClass('truncate')
  })

  it('renders description with smaller text', () => {
    renderComponent({
      name: 'Test',
      description: 'Small description',
    })

    const descriptionElement = screen.getByText('Small description')
    expect(descriptionElement).toHaveClass('text-xs')
  })

  it('applies hover effects via group classes', () => {
    const { container } = renderComponent({ name: 'Test Item' })

    const rootElement = container.firstChild as HTMLElement
    expect(rootElement).toHaveClass('group/item')

    const nameElement = screen.getByText('Test Item')
    expect(nameElement).toHaveClass('group-hover/item:text-text-primary')
  })

  it('positions actions on the right', () => {
    const { container } = renderComponent({
      name: 'Test',
      actions: <button>Action</button>,
    })

    const actionsContainer = container.querySelector('.ml-auto')
    expect(actionsContainer).toBeInTheDocument()
    expect(actionsContainer).toContainHTML('<button>Action</button>')
  })

  it('renders multiple actions', () => {
    renderComponent({
      name: 'Test',
      actions: (
        <>
          <button data-testid="edit">Edit</button>
          <button data-testid="delete">Delete</button>
        </>
      ),
    })

    expect(screen.getByTestId('edit')).toBeInTheDocument()
    expect(screen.getByTestId('delete')).toBeInTheDocument()
  })

  it('applies padding and spacing correctly', () => {
    const { container } = renderComponent({ name: 'Test' })

    const rootElement = container.firstChild as HTMLElement
    expect(rootElement).toHaveClass('pl-3', 'pr-1', 'py-1')
  })
})
