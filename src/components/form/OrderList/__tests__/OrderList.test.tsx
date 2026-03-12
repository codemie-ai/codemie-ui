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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import OrderList from '../OrderList'

// Mock @dnd-kit dependencies
vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children, onDragEnd }: any) => (
    <div data-testid="drag-drop-provider" data-ondragend={onDragEnd ? 'true' : 'false'}>
      {children}
    </div>
  ),
}))

vi.mock('@dnd-kit/react/sortable', () => ({
  useSortable: () => ({
    isDragging: false,
  }),
}))

interface TestItem extends Record<string, unknown> {
  id: string
  name: string
  order: number
}

const mockItems: TestItem[] = [
  { id: '1', name: 'Item 1', order: 1 },
  { id: '2', name: 'Item 2', order: 2 },
  { id: '3', name: 'Item 3', order: 3 },
]

const mockOnChange = vi.fn()

const defaultItemTemplate = (item: TestItem, _options: { isDragging: boolean }) => (
  <div data-testid={`item-${item.id}`}>{item.name}</div>
)

const renderComponent = (props: Partial<Parameters<typeof OrderList<TestItem>>[0]> = {}) => {
  const defaultProps: Parameters<typeof OrderList<TestItem>>[0] = {
    value: mockItems,
    idKey: 'id' as const,
    itemTemplate: defaultItemTemplate,
    onChange: mockOnChange,
  }

  return render(<OrderList {...defaultProps} {...props} />)
}

describe('OrderList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all items in the list', () => {
    renderComponent()

    expect(screen.getByTestId('item-1')).toBeInTheDocument()
    expect(screen.getByTestId('item-2')).toBeInTheDocument()
    expect(screen.getByTestId('item-3')).toBeInTheDocument()
  })

  it('renders items using the custom itemTemplate', () => {
    const customTemplate = (item: TestItem, _options: { isDragging: boolean }) => (
      <div data-testid={`custom-${item.id}`}>Custom: {item.name}</div>
    )

    renderComponent({ itemTemplate: customTemplate })

    expect(screen.getByTestId('custom-1')).toHaveTextContent('Custom: Item 1')
    expect(screen.getByTestId('custom-2')).toHaveTextContent('Custom: Item 2')
    expect(screen.getByTestId('custom-3')).toHaveTextContent('Custom: Item 3')
  })

  it('renders empty list without errors', () => {
    const { container } = renderComponent({ value: [] })

    const dragDropProvider = screen.getByTestId('drag-drop-provider')
    expect(dragDropProvider).toBeInTheDocument()
    expect(container.querySelector('[data-testid^="item-"]')).not.toBeInTheDocument()
  })

  it('applies custom className to the root element', () => {
    const customClass = 'custom-order-list'
    const { container } = renderComponent({ className: customClass })

    const rootElement = container.firstChild as HTMLElement
    expect(rootElement).toHaveClass(customClass)
  })

  it('uses the specified idKey for item identification', () => {
    const itemsWithCustomId = [
      { customId: 'a1', name: 'Item A', order: 1 },
      { customId: 'b2', name: 'Item B', order: 2 },
    ]

    const template = (item: (typeof itemsWithCustomId)[0], _options: { isDragging: boolean }) => (
      <div data-testid={`item-${item.customId}`}>{item.name}</div>
    )

    render(
      <OrderList
        value={itemsWithCustomId}
        idKey="customId"
        itemTemplate={template}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByTestId('item-a1')).toBeInTheDocument()
    expect(screen.getByTestId('item-b2')).toBeInTheDocument()
  })

  it('passes isDragging state to itemTemplate', () => {
    const templateWithDragging = (item: TestItem, { isDragging }: { isDragging: boolean }) => (
      <div data-testid={`item-${item.id}`} data-dragging={isDragging.toString()}>
        {item.name}
      </div>
    )

    renderComponent({ itemTemplate: templateWithDragging })

    const item = screen.getByTestId('item-1')
    expect(item).toHaveAttribute('data-dragging', 'false')
  })

  it('renders DragDropProvider with onDragEnd handler', () => {
    renderComponent()

    const dragDropProvider = screen.getByTestId('drag-drop-provider')
    expect(dragDropProvider).toHaveAttribute('data-ondragend', 'true')
  })

  it('renders DragDropProvider with onDragEnd handler even when onChange is not provided', () => {
    renderComponent({ onChange: undefined })

    // The component always passes onDragEnd, it just uses optional chaining internally
    const dragDropProvider = screen.getByTestId('drag-drop-provider')
    expect(dragDropProvider).toHaveAttribute('data-ondragend', 'true')
  })

  it('renders items with cursor-grab class for drag interaction', () => {
    const { container } = renderComponent()

    const draggableItems = container.querySelectorAll('.cursor-grab')
    expect(draggableItems).toHaveLength(mockItems.length)
  })

  it('renders single item correctly', () => {
    const singleItem = [{ id: '1', name: 'Only Item', order: 1 }]
    renderComponent({ value: singleItem })

    expect(screen.getByTestId('item-1')).toHaveTextContent('Only Item')
  })

  it('handles items with numeric ids', () => {
    const itemsWithNumericIds = [
      { id: 1, name: 'Item 1', order: 1 },
      { id: 2, name: 'Item 2', order: 2 },
    ]

    const template = (item: (typeof itemsWithNumericIds)[0], _options: { isDragging: boolean }) => (
      <div data-testid={`item-${item.id}`}>{item.name}</div>
    )

    render(
      <OrderList
        value={itemsWithNumericIds as any}
        idKey="id"
        itemTemplate={template}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByTestId('item-1')).toBeInTheDocument()
    expect(screen.getByTestId('item-2')).toBeInTheDocument()
  })

  it('renders items in flex column layout with gap', () => {
    const { container } = renderComponent()

    const itemsContainer = container.querySelector('.flex.flex-col.gap-2')
    expect(itemsContainer).toBeInTheDocument()
  })
})
