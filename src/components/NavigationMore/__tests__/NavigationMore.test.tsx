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
import { describe, it, expect, vi } from 'vitest'

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
})
