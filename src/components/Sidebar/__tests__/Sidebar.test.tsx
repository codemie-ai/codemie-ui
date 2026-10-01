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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { mockMobileLayout } from '@/test-utils/mobileLayout'

import Sidebar from '../Sidebar'

describe('Sidebar', () => {
  afterEach(() => {
    appInfoStore.sidebarExpanded = true
  })

  it('renders the title and children', () => {
    render(
      <Sidebar title="Chats">
        <div>list content</div>
      </Sidebar>
    )

    expect(screen.getByText('Chats')).toBeInTheDocument()
    expect(screen.getByText('list content')).toBeInTheDocument()
  })

  it('uses the fixed sidebar width when expanded (default, shared usage)', () => {
    appInfoStore.sidebarExpanded = true
    const { container } = render(<Sidebar title="Assistants" />)
    const aside = container.querySelector('aside')

    expect(aside).toHaveClass('w-sidebar')
    expect(aside).toHaveClass('max-w-sidebar')
    expect(aside).not.toHaveClass('w-full')
  })

  it('collapses to zero width when the sidebar is not expanded (default)', () => {
    appInfoStore.sidebarExpanded = false
    const { container } = render(<Sidebar title="Assistants" />)
    const aside = container.querySelector('aside')

    expect(aside).toHaveClass('w-0')
    expect(aside).not.toHaveClass('w-sidebar')
  })

  it('fills its container width when fillContainer is set (chat panel owns width)', () => {
    const { container } = render(<Sidebar title="Chats" fillContainer />)
    const aside = container.querySelector('aside')

    expect(aside).toHaveClass('w-full')
    expect(aside).not.toHaveClass('w-sidebar')
    expect(aside).not.toHaveClass('max-w-sidebar')
    expect(aside).not.toHaveClass('w-0')
  })
})

describe('Sidebar on mobile', () => {
  let restoreLayout = () => {}

  beforeEach(() => {
    restoreLayout = mockMobileLayout().restore
  })

  afterEach(() => {
    cleanup()
    restoreLayout()
    appInfoStore.mobileSidebarOpen = false
    appInfoStore.pageSidebarCount = 0
  })

  it('registers with the top bar and stays hidden until opened', () => {
    const { container, unmount } = render(<Sidebar title="Assistants" />)

    expect(appInfoStore.pageSidebarCount).toBe(1)
    expect(container.querySelector('aside')).toHaveClass('hidden')
    expect(screen.queryByRole('button', { name: /sidebar/i })).not.toBeInTheDocument()

    unmount()
    expect(appInfoStore.pageSidebarCount).toBe(0)
  })

  it('shows the overlay while open and closes it on Escape', () => {
    appInfoStore.mobileSidebarOpen = true
    const { container } = render(<Sidebar title="Assistants" />)

    expect(container.querySelector('aside')).not.toHaveClass('hidden')
    expect(container.querySelector('aside')).toHaveClass('fixed')

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(appInfoStore.mobileSidebarOpen).toBe(false)
  })
  it('makes the page behind the open overlay inert', () => {
    appInfoStore.mobileSidebarOpen = true
    const { rerender } = render(
      <div data-app-content>
        <Sidebar title="Assistants" />
        <main>page content</main>
      </div>
    )
    expect(screen.getByRole('main', { hidden: true })).toHaveAttribute('inert')

    appInfoStore.mobileSidebarOpen = false
    rerender(
      <div data-app-content>
        <Sidebar title="Assistants" />
        <main>page content</main>
      </div>
    )
    expect(screen.getByRole('main')).not.toHaveAttribute('inert')
  })

  it('leaves Escape to a dialog opened over the overlay', () => {
    appInfoStore.mobileSidebarOpen = true
    render(
      <>
        <Sidebar title="Assistants" />
        <dialog open>
          <button type="button">Rename</button>
        </dialog>
      </>
    )
    screen.getByRole('button', { name: 'Rename' }).focus()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(appInfoStore.mobileSidebarOpen).toBe(true)
  })
})
