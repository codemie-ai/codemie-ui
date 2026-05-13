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

import { OverlayPanel } from 'primereact/overlaypanel'
import {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'

import { cn } from '@/utils/utils'

export interface ComboboxItem<T> {
  id: string
  value: T
}

export interface ComboboxOptionState {
  highlighted: boolean
  selected: boolean
  index: number
}

export interface SearchableComboboxProps<T> {
  items: ComboboxItem<T>[]
  isOptionSelected: (item: ComboboxItem<T>) => boolean
  onSelect: (value: T) => void

  searchValue: string
  onSearchChange: (q: string) => void
  searchPlaceholder?: string

  listboxId?: string
  listboxAriaLabel: string
  searchAriaLabel: string

  renderTrigger: (props: { onClick: (e: MouseEvent<HTMLButtonElement>) => void }) => ReactNode
  renderOption: (item: ComboboxItem<T>, state: ComboboxOptionState) => ReactNode
  renderSeparatorBefore?: (item: ComboboxItem<T>, index: number) => ReactNode | null
  renderEmpty?: () => ReactNode

  optionClassName?: (item: ComboboxItem<T>, state: ComboboxOptionState) => string
  panelClassName?: string
  listClassName?: string

  disabled?: boolean
}

const SearchableCombobox = <T,>({
  items,
  isOptionSelected,
  onSelect,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  listboxId,
  listboxAriaLabel,
  searchAriaLabel,
  renderTrigger,
  renderOption,
  renderSeparatorBefore,
  renderEmpty,
  optionClassName,
  panelClassName,
  listClassName,
  disabled = false,
}: SearchableComboboxProps<T>) => {
  const overlayRef = useRef<OverlayPanel>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const reactId = useId()
  const resolvedListboxId = listboxId ?? `searchable-combobox-listbox-${reactId}`

  useEffect(() => {
    setHighlightedIndex(0)
  }, [searchValue])

  useEffect(() => {
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex])

  const handleTriggerClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    overlayRef.current?.toggle(e)
  }

  const handleSelect = (value: T) => {
    onSelect(value)
    overlayRef.current?.hide()
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      overlayRef.current?.hide()
      return
    }
    const len = items.length
    if (len === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((i) => (i + 1) % len)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((i) => (i - 1 + len) % len)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = items[highlightedIndex] ?? items[0]
      if (item) handleSelect(item.value)
    }
  }

  const handleOverlayShow = () => {
    setHighlightedIndex(0)
    onSearchChange('')
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  const activeDescendantId = items.length > 0 ? items[highlightedIndex]?.id : undefined

  return (
    <>
      {renderTrigger({ onClick: handleTriggerClick })}

      <OverlayPanel
        ref={overlayRef}
        onShow={handleOverlayShow}
        className={cn(
          'bg-surface-base-secondary rounded-lg border border-border-structural shadow-xl p-0 overflow-hidden',
          panelClassName
        )}
      >
        <div className="flex flex-col min-w-56 max-w-72">
          <div className="px-3 pt-3 pb-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-label={searchAriaLabel}
              aria-expanded={true}
              aria-controls={resolvedListboxId}
              aria-activedescendant={activeDescendantId}
              aria-autocomplete="list"
              className={cn(
                'w-full text-sm bg-surface-elevated border border-border-secondary rounded-md',
                'px-2.5 py-1.5 text-text-primary placeholder:text-text-quaternary',
                'outline-none focus:border-border-accent transition-colors'
              )}
            />
          </div>

          <div
            id={resolvedListboxId}
            role="listbox" // NOSONAR: WAI-ARIA combobox pattern; the custom UI hosts search input, sub-labels, and dividers that a native <select> cannot.
            aria-label={listboxAriaLabel}
            className={cn('max-h-64 overflow-y-auto pb-2', listClassName)}
          >
            {items.length === 0 && renderEmpty?.()}
            {items.map((item, index) => {
              const state: ComboboxOptionState = {
                highlighted: highlightedIndex === index,
                selected: isOptionSelected(item),
                index,
              }
              const extraClass = optionClassName?.(item, state) ?? ''
              return (
                <div key={item.id}>
                  {renderSeparatorBefore?.(item, index) ?? null}
                  <button
                    type="button"
                    id={item.id}
                    role="option" // NOSONAR: option within the custom combobox; native <option> not viable here.
                    aria-selected={state.selected}
                    ref={(el) => {
                      itemRefs.current[index] = el
                    }}
                    onClick={() => handleSelect(item.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-3 py-2',
                      'text-sm text-left transition-colors hover:bg-surface-elevated cursor-pointer',
                      state.highlighted && 'bg-surface-elevated',
                      extraClass
                    )}
                  >
                    {renderOption(item, state)}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </OverlayPanel>
    </>
  )
}

SearchableCombobox.displayName = 'SearchableCombobox'

export default SearchableCombobox
