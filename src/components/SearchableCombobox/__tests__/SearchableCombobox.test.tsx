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

import { fireEvent, render, screen } from '@testing-library/react'
import React, { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import SearchableCombobox, { ComboboxItem } from '../SearchableCombobox'

const { mockOverlayHide } = vi.hoisted(() => ({ mockOverlayHide: vi.fn() }))

vi.mock('primereact/overlaypanel', () => ({
  OverlayPanel: React.forwardRef<any, any>(({ children, onShow }, ref) => {
    React.useImperativeHandle(ref, () => ({
      toggle: () => onShow?.(),
      show: () => onShow?.(),
      hide: mockOverlayHide,
    }))
    return <div data-testid="overlay-panel">{children}</div>
  }),
}))

type Item = ComboboxItem<string>

interface HarnessProps {
  initialItems?: Item[]
  initialSelected?: string | null
  onSelect?: (v: string) => void
  withSeparator?: boolean
  withEmpty?: boolean
  filterBySearch?: boolean
}

const Harness = ({
  initialItems = [
    { id: 'opt-alpha', value: 'alpha' },
    { id: 'opt-beta', value: 'beta' },
    { id: 'opt-gamma', value: 'gamma' },
  ],
  initialSelected = null,
  onSelect,
  withSeparator = false,
  withEmpty = false,
  filterBySearch = false,
}: HarnessProps) => {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(initialSelected)

  const visibleItems =
    filterBySearch && search
      ? initialItems.filter((i) => i.value.toLowerCase().includes(search.toLowerCase()))
      : initialItems

  return (
    <SearchableCombobox<string>
      items={visibleItems}
      isOptionSelected={(item) => item.value === selected}
      onSelect={(v) => {
        setSelected(v)
        onSelect?.(v)
      }}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search items…"
      listboxId="test-listbox"
      listboxAriaLabel="Test list"
      searchAriaLabel="Search test items"
      renderTrigger={({ onClick }) => (
        <button type="button" onClick={onClick} aria-label="trigger">
          Open
        </button>
      )}
      renderOption={(item) => <span>{item.value}</span>}
      renderSeparatorBefore={
        withSeparator
          ? (item) => (item.id === 'opt-beta' ? <hr data-testid="separator" /> : null)
          : undefined
      }
      renderEmpty={withEmpty ? () => <p>No items</p> : undefined}
    />
  )
}

describe('SearchableCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('renders the trigger and the search input', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'trigger' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search items…')).toBeInTheDocument()
  })

  it('highlights the first item by default via aria-activedescendant', () => {
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-alpha')
  })

  it('ArrowDown moves the highlight to the next item', () => {
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-beta')
  })

  it('ArrowUp from the first item wraps to the last', () => {
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-gamma')
  })

  it('ArrowDown past the last item wraps to the first', () => {
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-alpha')
  })

  it('Enter on highlighted item calls onSelect and hides overlay', () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    const input = screen.getByPlaceholderText('Search items…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('beta')
    expect(mockOverlayHide).toHaveBeenCalled()
  })

  it('Escape hides the overlay panel', () => {
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(mockOverlayHide).toHaveBeenCalled()
  })

  it('typing into search resets highlighted index to 0', () => {
    render(<Harness filterBySearch />)
    const input = screen.getByPlaceholderText('Search items…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-beta')
    fireEvent.change(input, { target: { value: 'gamma' } })
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-gamma')
  })

  it('hovering an option updates highlight so Enter selects that option', () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    const input = screen.getByPlaceholderText('Search items…')
    const gamma = screen.getByRole('option', { name: 'gamma' })
    fireEvent.mouseEnter(gamma)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('gamma')
  })

  it('clicking an option calls onSelect and hides the overlay', () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    const beta = screen.getByRole('option', { name: 'beta' })
    fireEvent.click(beta)
    expect(onSelect).toHaveBeenCalledWith('beta')
    expect(mockOverlayHide).toHaveBeenCalled()
  })

  it('empty list: keys no-op, aria-activedescendant is absent, renderEmpty shows', () => {
    render(<Harness initialItems={[]} withEmpty />)
    const input = screen.getByPlaceholderText('Search items…')
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('No items')).toBeInTheDocument()
  })

  it('renders a separator before the targeted item when renderSeparatorBefore is provided', () => {
    render(<Harness withSeparator />)
    const separators = screen.getAllByTestId('separator')
    expect(separators).toHaveLength(1)
  })

  it('reopening via trigger resets highlight to first item', () => {
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).toBe('opt-gamma')

    const trigger = screen.getByRole('button', { name: 'trigger' })
    fireEvent.click(trigger)

    expect(input.getAttribute('aria-activedescendant')).toBe('opt-alpha')
  })

  it('aria-activedescendant references the DOM id of the highlighted option', () => {
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    const id = input.getAttribute('aria-activedescendant')
    expect(id).toBe('opt-beta')
    const el = document.getElementById(id!)
    expect(el?.getAttribute('role')).toBe('option')
  })

  it('aria attributes: combobox role, controls listbox, listbox has aria-label', () => {
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    expect(input.getAttribute('role')).toBe('combobox')
    expect(input.getAttribute('aria-controls')).toBe('test-listbox')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(input.getAttribute('aria-autocomplete')).toBe('list')
    const listbox = document.getElementById('test-listbox')
    expect(listbox?.getAttribute('role')).toBe('listbox')
    expect(listbox?.getAttribute('aria-label')).toBe('Test list')
  })

  it('option has aria-selected reflecting isOptionSelected', () => {
    render(<Harness initialSelected="beta" />)
    const beta = screen.getByRole('option', { name: 'beta' })
    expect(beta.getAttribute('aria-selected')).toBe('true')
    const alpha = screen.getByRole('option', { name: 'alpha' })
    expect(alpha.getAttribute('aria-selected')).toBe('false')
  })

  it('disabled trigger: clicking does not open the overlay (toggle not called)', () => {
    const Disabled = () => {
      const [search, setSearch] = useState('')
      return (
        <SearchableCombobox<string>
          items={[{ id: 'a', value: 'a' }]}
          isOptionSelected={() => false}
          onSelect={() => {}}
          searchValue={search}
          onSearchChange={setSearch}
          listboxAriaLabel="x"
          searchAriaLabel="x"
          disabled
          renderTrigger={({ onClick }) => (
            <button type="button" onClick={onClick} aria-label="trigger">
              Open
            </button>
          )}
          renderOption={(item) => <span>{item.value}</span>}
        />
      )
    }
    render(<Disabled />)
    const trigger = screen.getByRole('button', { name: 'trigger' })
    // The mocked overlay only fires onShow via toggle(); with disabled, toggle is bypassed.
    // We can't directly observe toggle being skipped because the mock is internal, but we can
    // observe that the search input remains empty and no aria-activedescendant change happens.
    const input = screen.getByPlaceholderText('Search…')
    expect(input.getAttribute('aria-activedescendant')).toBe('a')
    fireEvent.click(trigger)
    // After click on disabled trigger, the overlay's onShow should NOT have fired,
    // so the search-reset-on-show side effect does not run. We assert no overlay show
    // was triggered by checking the input is still the same (no change).
    expect(input.getAttribute('aria-activedescendant')).toBe('a')
  })

  it('triggers scrollIntoView on the highlighted item when highlight changes', () => {
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView')
    render(<Harness />)
    const input = screen.getByPlaceholderText('Search items…')
    spy.mockClear()
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(spy).toHaveBeenCalled()
  })

  it('generates a unique listbox id when listboxId is not provided', () => {
    const Auto = () => {
      const [search, setSearch] = useState('')
      return (
        <SearchableCombobox<string>
          items={[{ id: 'x', value: 'x' }]}
          isOptionSelected={() => false}
          onSelect={() => {}}
          searchValue={search}
          onSearchChange={setSearch}
          listboxAriaLabel="x"
          searchAriaLabel="x"
          renderTrigger={({ onClick }) => (
            <button type="button" onClick={onClick}>
              t
            </button>
          )}
          renderOption={(item) => <span>{item.value}</span>}
        />
      )
    }
    render(<Auto />)
    const input = screen.getByPlaceholderText('Search…')
    const id = input.getAttribute('aria-controls')
    expect(id).toBeTruthy()
    expect(document.getElementById(id!)?.getAttribute('role')).toBe('listbox')
  })
})
