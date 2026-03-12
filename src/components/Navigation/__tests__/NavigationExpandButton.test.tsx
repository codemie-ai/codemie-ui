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

import NavigationExpandButton from '../NavigationExpandButton'

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      navigationExpanded: false,
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/assets/icons/sidebar-alt.svg?react', () => ({
  default: (props: any) => <svg data-testid="sidebar-icon" {...props} />,
}))

describe('NavigationExpandButton', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.navigationExpanded = false
  })

  it('renders without crashing', () => {
    const { container } = render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders as a button element', () => {
    render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders with correct type attribute', () => {
    render(<NavigationExpandButton onClick={mockOnClick} />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('renders sidebar icon', () => {
    render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByTestId('sidebar-icon')).toBeInTheDocument()
  })

  it('calls onClick when button is clicked', () => {
    render(<NavigationExpandButton onClick={mockOnClick} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('renders "Hide Menu" when expanded', () => {
    mockAppInfoStore.navigationExpanded = true
    render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByText('Hide Menu')).toBeInTheDocument()
  })

  it('renders empty text when collapsed', () => {
    mockAppInfoStore.navigationExpanded = false
    render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.queryByText('Hide Menu')).not.toBeInTheDocument()
  })

  it('rotates icon when collapsed', () => {
    mockAppInfoStore.navigationExpanded = false
    render(<NavigationExpandButton onClick={mockOnClick} />)
    const icon = screen.getByTestId('sidebar-icon')
    expect(icon).toHaveClass('rotate-180')
  })

  it('does not rotate icon when expanded', () => {
    mockAppInfoStore.navigationExpanded = true
    render(<NavigationExpandButton onClick={mockOnClick} />)
    const icon = screen.getByTestId('sidebar-icon')
    expect(icon).not.toHaveClass('rotate-180')
  })

  it('shows "Expand Menu" tooltip when collapsed', () => {
    mockAppInfoStore.navigationExpanded = false
    render(<NavigationExpandButton onClick={mockOnClick} />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-tooltip-content', 'Expand Menu')
  })

  it('does not show tooltip when expanded', () => {
    mockAppInfoStore.navigationExpanded = true
    render(<NavigationExpandButton onClick={mockOnClick} />)
    const button = screen.getByRole('button')
    expect(button).not.toHaveAttribute('data-tooltip-content')
  })

  it('updates when navigationExpanded changes from collapsed to expanded', () => {
    mockAppInfoStore.navigationExpanded = false
    const { rerender } = render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.queryByText('Hide Menu')).not.toBeInTheDocument()

    mockAppInfoStore.navigationExpanded = true
    rerender(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByText('Hide Menu')).toBeInTheDocument()
  })

  it('updates when navigationExpanded changes from expanded to collapsed', () => {
    mockAppInfoStore.navigationExpanded = true
    const { rerender } = render(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.getByText('Hide Menu')).toBeInTheDocument()

    mockAppInfoStore.navigationExpanded = false
    rerender(<NavigationExpandButton onClick={mockOnClick} />)
    expect(screen.queryByText('Hide Menu')).not.toBeInTheDocument()
  })

  it('updates icon rotation on state change', () => {
    mockAppInfoStore.navigationExpanded = true
    const { rerender } = render(<NavigationExpandButton onClick={mockOnClick} />)
    let icon = screen.getByTestId('sidebar-icon')
    expect(icon).not.toHaveClass('rotate-180')

    mockAppInfoStore.navigationExpanded = false
    rerender(<NavigationExpandButton onClick={mockOnClick} />)
    icon = screen.getByTestId('sidebar-icon')
    expect(icon).toHaveClass('rotate-180')
  })

  it('updates tooltip on state change', () => {
    mockAppInfoStore.navigationExpanded = false
    const { rerender } = render(<NavigationExpandButton onClick={mockOnClick} />)
    let button = screen.getByRole('button')
    expect(button).toHaveAttribute('data-tooltip-content', 'Expand Menu')

    mockAppInfoStore.navigationExpanded = true
    rerender(<NavigationExpandButton onClick={mockOnClick} />)
    button = screen.getByRole('button')
    expect(button).not.toHaveAttribute('data-tooltip-content')
  })
})
