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

import SidebarToggle from '../SidebarToggle'

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      sidebarExpanded: true,
      toggleSidebar: vi.fn(),
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

vi.mock('@/hooks/useSidebarOffsetClass', () => ({
  useSidebarOffsetClass: vi.fn(() => 'left-navbar'),
}))

vi.mock('@/assets/icons/chevron-left.svg?react', () => ({
  default: (props: any) => <svg data-testid="chevron-icon" {...props} />,
}))

describe('SidebarToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.sidebarExpanded = true
    mockAppInfoStore.toggleSidebar = vi.fn()
  })

  it('renders without crashing', () => {
    const { container } = render(<SidebarToggle />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders as a button element with type="button"', () => {
    render(<SidebarToggle />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('type', 'button')
  })

  it('renders the chevron icon', () => {
    render(<SidebarToggle />)
    expect(screen.getByTestId('chevron-icon')).toBeInTheDocument()
  })

  it('has aria-label "Hide Sidebar" when expanded', () => {
    mockAppInfoStore.sidebarExpanded = true
    render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Hide Sidebar')
  })

  it('has aria-label "Open Sidebar" when collapsed', () => {
    mockAppInfoStore.sidebarExpanded = false
    render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Open Sidebar')
  })

  it('has aria-expanded true when expanded', () => {
    mockAppInfoStore.sidebarExpanded = true
    render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')
  })

  it('has aria-expanded false when collapsed', () => {
    mockAppInfoStore.sidebarExpanded = false
    render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('does not rotate icon when sidebar is expanded', () => {
    mockAppInfoStore.sidebarExpanded = true
    render(<SidebarToggle />)
    expect(screen.getByTestId('chevron-icon')).not.toHaveClass('rotate-180')
  })

  it('rotates icon when sidebar is collapsed', () => {
    mockAppInfoStore.sidebarExpanded = false
    render(<SidebarToggle />)
    expect(screen.getByTestId('chevron-icon')).toHaveClass('rotate-180')
  })

  it('calls toggleSidebar when button is clicked', () => {
    render(<SidebarToggle />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockAppInfoStore.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('updates aria-label from "Hide Sidebar" to "Open Sidebar" on state change', () => {
    mockAppInfoStore.sidebarExpanded = true
    const { rerender } = render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Hide Sidebar')

    mockAppInfoStore.sidebarExpanded = false
    rerender(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Open Sidebar')
  })

  it('updates aria-label from "Open Sidebar" to "Hide Sidebar" on state change', () => {
    mockAppInfoStore.sidebarExpanded = false
    const { rerender } = render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Open Sidebar')

    mockAppInfoStore.sidebarExpanded = true
    rerender(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Hide Sidebar')
  })

  it('updates aria-expanded on state change', () => {
    mockAppInfoStore.sidebarExpanded = true
    const { rerender } = render(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true')

    mockAppInfoStore.sidebarExpanded = false
    rerender(<SidebarToggle />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false')
  })

  it('toggles sidebar when Ctrl+B is pressed', () => {
    render(<SidebarToggle />)
    fireEvent.keyDown(document, { code: 'KeyB', ctrlKey: true })
    expect(mockAppInfoStore.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('toggles sidebar when Meta+B is pressed', () => {
    render(<SidebarToggle />)
    fireEvent.keyDown(document, { code: 'KeyB', metaKey: true })
    expect(mockAppInfoStore.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('does not toggle sidebar for unrelated keys', () => {
    render(<SidebarToggle />)
    fireEvent.keyDown(document, { code: 'KeyB' })
    fireEvent.keyDown(document, { code: 'KeyA', ctrlKey: true })
    expect(mockAppInfoStore.toggleSidebar).not.toHaveBeenCalled()
  })
})
