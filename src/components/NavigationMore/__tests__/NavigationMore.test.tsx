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
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import NavigationMore, { NavigationItem } from '../NavigationMore'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({
  default: () => <span data-testid="nav-more-icon" />,
}))

const makeItems = (overrides: Partial<NavigationItem>[] = []): NavigationItem[] => [
  { title: 'Edit', onClick: vi.fn(), ...overrides[0] },
  { title: 'Delete', onClick: vi.fn(), ...overrides[1] },
]

const openMenu = () => {
  fireEvent.click(screen.getByRole('button', { name: 'More options' }))
}

afterEach(cleanup)

describe('NavigationMore', () => {
  it('renders items inside a <ul> when popup is open', () => {
    const { container } = render(<NavigationMore items={makeItems()} />)
    openMenu()
    expect(container.querySelector('ul')).toBeInTheDocument()
  })

  it('wraps each visible item in a <li>', () => {
    const { container } = render(<NavigationMore items={makeItems()} />)
    openMenu()
    const listItems = container.querySelectorAll('li')
    expect(listItems).toHaveLength(2)
  })

  it('does not render a <li> for hidden items', () => {
    const items = makeItems([{}, { hidden: true }])
    const { container } = render(<NavigationMore items={items} />)
    openMenu()
    const listItems = container.querySelectorAll('li')
    expect(listItems).toHaveLength(1)
  })

  it('menu container has aria-label "Options" not "Export options"', () => {
    render(<NavigationMore items={makeItems()} />)
    openMenu()
    const menu = screen.getByRole('menu')
    expect(menu).toHaveAttribute('aria-label', 'Options')
    expect(menu).not.toHaveAttribute('aria-label', 'Export options')
  })

  it('does not render <ul> when no items prop is provided', () => {
    const { container } = render(<NavigationMore>{<span>child</span>}</NavigationMore>)
    openMenu()
    expect(container.querySelector('ul')).not.toBeInTheDocument()
  })

  it('each item button retains role="menuitem"', () => {
    render(<NavigationMore items={makeItems()} />)
    openMenu()
    const menuItems = screen.getAllByRole('menuitem')
    expect(menuItems).toHaveLength(2)
  })

  it('<ul> has role="none"', () => {
    const { container } = render(<NavigationMore items={makeItems()} />)
    openMenu()
    expect(container.querySelector('ul')).toHaveAttribute('role', 'none')
  })

  it('<li> elements have role="none"', () => {
    const { container } = render(<NavigationMore items={makeItems()} />)
    openMenu()
    const listItems = container.querySelectorAll('li')
    listItems.forEach((li) => {
      expect(li).toHaveAttribute('role', 'none')
    })
  })

  it('does not render <ul> when items is an empty array', () => {
    const { container } = render(<NavigationMore items={[]} />)
    openMenu()
    expect(container.querySelector('ul')).not.toBeInTheDocument()
  })

  it('does not render <ul> when all items are hidden', () => {
    const items = makeItems([{ hidden: true }, { hidden: true }])
    const { container } = render(<NavigationMore items={items} />)
    openMenu()
    expect(container.querySelector('ul')).not.toBeInTheDocument()
  })

  it('closes a portal menu when its scroll container moves', () => {
    render(
      <div data-testid="scroll-container" style={{ maxHeight: 10, overflow: 'auto' }}>
        <NavigationMore items={makeItems()} renderInRoot />
      </div>
    )

    openMenu()
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.scroll(screen.getByTestId('scroll-container'))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders a divider as a separator, not a menuitem', () => {
    const items = [
      { title: 'Edit', onClick: vi.fn() },
      { title: 'sep', divider: true as const },
    ]
    render(<NavigationMore items={items} />)
    openMenu()
    expect(screen.getByRole('separator')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(1)
  })

  it('renders an href item as a disabled link that does not fire onClick', () => {
    const onClick = vi.fn()
    const items = [{ title: 'View', href: '/x', onClick, disabled: true }]
    render(
      <MemoryRouter>
        <NavigationMore items={items} />
      </MemoryRouter>
    )
    openMenu()
    const link = screen.getByRole('menuitem')
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(link)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('keeps the menu open when a disabled href item is clicked with hideOnClickInside', () => {
    const onClick = vi.fn()
    const items = [{ title: 'View', href: '/x', onClick, disabled: true }]
    render(
      <MemoryRouter>
        <NavigationMore items={items} hideOnClickInside />
      </MemoryRouter>
    )
    openMenu()
    const link = screen.getByRole('menuitem')
    fireEvent.click(link)
    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('does not underline an href item on hover', () => {
    const items = [{ title: 'View', href: '/x', onClick: vi.fn() }]
    render(
      <MemoryRouter>
        <NavigationMore items={items} />
      </MemoryRouter>
    )
    openMenu()
    const link = screen.getByRole('menuitem')
    expect(link.tagName).toBe('A')
    expect(link).toHaveClass('hover:no-underline')
  })

  it('does not underline a button item on hover', () => {
    render(<NavigationMore items={makeItems()} />)
    openMenu()
    const [button] = screen.getAllByRole('menuitem')
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveClass('hover:no-underline')
  })

  it('disables the trigger when every item is hidden', () => {
    const items = makeItems([{ hidden: true }, { hidden: true }])
    render(<NavigationMore items={items} />)
    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).toBeDisabled()

    fireEvent.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('disables the trigger when items is an empty array', () => {
    render(<NavigationMore items={[]} />)
    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).toBeDisabled()
  })

  it('keeps the trigger enabled when at least one item is visible', () => {
    const items = makeItems([{}, { hidden: true }])
    render(<NavigationMore items={items} />)
    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).not.toBeDisabled()
  })

  it('keeps the trigger enabled when only children are provided', () => {
    render(<NavigationMore>{<span>child</span>}</NavigationMore>)
    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).not.toBeDisabled()
  })

  it('shows the trigger focus ring only for keyboard-visible focus', () => {
    render(<NavigationMore items={makeItems()} />)

    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).toHaveClass(
      'focus-visible:ring-2',
      'focus-visible:ring-primary-500',
      'focus-visible:ring-offset-1'
    )
    expect(trigger).not.toHaveClass('focus:ring-2')
  })
})

describe('NavigationMore accessibility attributes', () => {
  it('trigger button has no aria-controls when closed and points to menu when open', () => {
    render(<NavigationMore items={makeItems()} />)
    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).not.toHaveAttribute('aria-controls')

    fireEvent.click(trigger)
    const menuId = trigger.getAttribute('aria-controls')
    expect(menuId).toBeTruthy()
    expect(document.getElementById(menuId!)).toBeInTheDocument()
    expect(document.getElementById(menuId!)).toHaveAttribute('role', 'menu')
  })

  it('without contextId keeps aria-label and has no aria-labelledby', () => {
    render(<NavigationMore items={makeItems()} />)
    const trigger = screen.getByRole('button', { name: 'More options' })
    expect(trigger).toHaveAttribute('aria-label', 'More options')
    expect(trigger).not.toHaveAttribute('aria-labelledby')
  })

  it('with contextId adds compound aria-labelledby and sr-only More Options span', () => {
    const { container } = render(
      <div>
        <button id="chat-name-abc">My Chat</button>
        <NavigationMore contextId="chat-name-abc" items={makeItems()} />
      </div>
    )
    const trigger = container.querySelector('button[aria-haspopup]') as HTMLElement
    expect(trigger).toHaveAttribute('id')
    const buttonId = trigger.getAttribute('id')!
    expect(trigger).toHaveAttribute('aria-labelledby', `${buttonId} chat-name-abc`)
    expect(trigger).not.toHaveAttribute('aria-label')
    const srOnly = trigger.querySelector('.sr-only')
    expect(srOnly).toBeInTheDocument()
    expect(srOnly).toHaveTextContent('More options')
  })

  it('with contextId aria-controls still links trigger to menu after open', () => {
    const { container } = render(
      <div>
        <button id="chat-name-xyz">Chat</button>
        <NavigationMore contextId="chat-name-xyz" items={makeItems()} />
      </div>
    )
    const trigger = container.querySelector('button[aria-haspopup]') as HTMLElement
    fireEvent.click(trigger)
    const menuId = trigger.getAttribute('aria-controls')!
    expect(document.getElementById(menuId)).toHaveAttribute('role', 'menu')
  })

  it('with data-tooltip-content and no contextId sets aria-label to the tooltip content', () => {
    render(<NavigationMore data-tooltip-content="Export diagram" items={makeItems()} />)
    const trigger = screen.getByRole('button', { name: 'Export diagram' })
    expect(trigger).toHaveAttribute('aria-label', 'Export diagram')
    expect(trigger).not.toHaveAttribute('aria-labelledby')
  })

  it('returns focus to trigger button when Escape closes the menu', () => {
    render(<NavigationMore items={makeItems()} />)
    const trigger = screen.getByRole('button', { name: 'More options' })

    fireEvent.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(trigger).toHaveFocus()
  })
})
