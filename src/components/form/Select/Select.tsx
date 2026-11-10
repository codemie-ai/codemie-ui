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

import { isNil } from 'lodash'
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown'
import { forwardRef, ReactNode, Ref, useEffect, useId, useRef, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import FieldAnnouncer from '@/components/form/FieldAnnouncer'
import TooltipButton from '@/components/TooltipButton'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { FilterOption } from '@/types/filters'
import { cn } from '@/utils/utils'

interface SelectProps<TValue extends string | number | null = string | number | null> {
  id?: string
  name?: string
  value?: TValue
  onChange?: (e: DropdownChangeEvent) => void
  onChangeValue?: (value: TValue | null) => void
  options: FilterOption[]
  placeholder?: string
  className?: string
  valueTemplate?: ReactNode
  itemTemplate?: (option: FilterOption) => ReactNode
  rootClassName?: string
  classNameValue?: string
  disabled?: boolean
  panelFooterTemplate?: ReactNode
  optionTruncateThreshold?: number
  showClear?: boolean
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'mouse'
  label?: string
  panelClassName?: string
  errorClassName?: string
  error?: string
  allowCustom?: boolean
  required?: boolean
  loading?: boolean
  inputRef?: Ref<HTMLSelectElement>
  hint?: string
  appendTo?: 'self' | HTMLElement | null | undefined
  filter?: boolean
  filterBy?: string
  filterPlaceholder?: string
  /** Accessible name for a select without a visible `label`; a visible label names it already. */
  ariaLabel?: string
  /** Id of the element naming the control; used as `aria-labelledby` on the combobox. */
  ariaLabelledBy?: string
  /**
   * Opt-in: expose a named combobox with `aria-expanded`/`aria-controls` (input stays
   * readonly), hide the trigger button from assistive technology and announce the selected
   * option through a polite live region.
   */
  a11yCombobox?: boolean
  /** Opt-in: accessible name of the open listbox (default is PrimeReact's "Option List"). */
  listboxLabel?: string
  /**
   * Selector hooks placed on the Dropdown control itself, not on a layout
   * wrapper around it. The marketplace filter testids used to sit on the
   * enclosing `<div>`, so the id and the element a spec interacts with were
   * different nodes (review-e2e-coverage-spec §3).
   */
  'data-testid'?: string
  'data-value'?: string
}

interface DefaultOptionTemplateProps {
  option: FilterOption
}

const DefaultOptionTemplate = ({ option }: DefaultOptionTemplateProps) => {
  const optionEl = useRef<HTMLParagraphElement>(null)
  const isTruncated = useIsTruncated(optionEl)

  return (
    <p
      ref={optionEl}
      data-tooltip-id="react-tooltip"
      data-tooltip-content={isTruncated ? option.label : ''}
      data-tooltip-class-name="max-w-2xl"
      className="px-2.5 py-1.5 truncate"
    >
      {option.label}
    </p>
  )
}

const renderDefaultOptionTemplate = (option: FilterOption) => (
  <DefaultOptionTemplate option={option} />
)

// PrimeReact returns the full option object when the selected value is an empty
// string (a known bug). This helper always returns a safe primitive.
function extractValue(raw: unknown): string | number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'string' || typeof raw === 'number') return raw
  // Object leaked through — treat as cleared selection
  return null
}

// forwardRef does not support generics natively, so we cast the result to preserve TValue inference.
const Select = forwardRef(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <TValue extends string | number | null = string | number | null>(
    {
      id,
      name,
      value,
      onChange,
      onChangeValue,
      options,
      placeholder,
      className = '',
      rootClassName,
      classNameValue = '',
      disabled = false,
      valueTemplate,
      itemTemplate,
      panelFooterTemplate,
      showClear,
      label,
      panelClassName,
      errorClassName,
      error,
      allowCustom = false,
      required = false,
      loading,
      inputRef,
      hint,
      'data-testid': dataTestId,
      'data-value': dataValue,
      appendTo,
      filter,
      filterBy,
      filterPlaceholder,
      ariaLabel,
      ariaLabelledBy,
      a11yCombobox = false,
      listboxLabel,
    }: SelectProps<TValue>,
    ref: Ref<Dropdown>
  ) => {
    const listId = useId()
    const [announcement, setAnnouncement] = useState('')
    const dropdown = useRef<Dropdown | null>(null)
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        const instance = dropdown.current
        if (
          event.key !== 'Escape' ||
          !(event.target instanceof Node) ||
          !instance?.getElement()?.querySelector('[aria-expanded="true"]')
        )
          return
        if (
          !instance?.getElement()?.contains(event.target) &&
          !instance?.getOverlay()?.contains(event.target)
        )
          return
        event.preventDefault()
        event.stopPropagation()
        instance?.hide()
        instance?.focus()
      }
      document.addEventListener('keydown', handleEscape, true)
      return () => document.removeEventListener('keydown', handleEscape, true)
    }, [])
    const ResolvedOptionTemplate = itemTemplate ?? renderDefaultOptionTemplate

    const handleChange = (e: DropdownChangeEvent) => {
      if (a11yCombobox) {
        const selected = enhancedOptions.find((o) => o.value === e.value)
        if (selected) setAnnouncement(`${selected.label} selected`)
      }
      onChange?.(e)
      onChangeValue?.(extractValue(e.value) as TValue | null)
    }

    const shouldAddValue =
      allowCustom && !isNil(value) && value !== '' && !options.some((opt) => opt.value === value)
    const enhancedOptions = shouldAddValue ? [...options, { label: String(value), value }] : options

    // The focusable combobox is PrimeReact's keyboard input, not the root (which keeps `id`).
    // The visible label names it through `htmlFor`, so `aria-label` is set only for an explicit
    // `ariaLabel`. Its ARIA attributes are raw `aria-*` props, which PrimeReact applies to that
    // input alone: its `ariaLabel` prop and `pt.input` would also copy them onto the dropdown
    // trigger and the value span, giving them duplicate names.
    const generatedId = useId()
    const inputId = `${id ?? generatedId}-input`

    return (
      <div className={cn('flex flex-col', rootClassName)}>
        <FieldAnnouncer
          id={id}
          error={error}
          errorClassName={cn('text-failed-secondary text-sm mt-1', errorClassName)}
        >
          {({ ariaInvalid, ariaDescribedBy }) => (
            <div className="flex flex-col gap-2">
              {label && (
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-text-quaternary" htmlFor={inputId}>
                    {label}
                    {required && <span className="text-text-error ml-0.5">*</span>}
                  </label>
                  {hint && <TooltipButton content={hint} />}
                </div>
              )}
              <Dropdown
                data-testid={dataTestId}
                data-value={dataValue}
                showClear={showClear}
                id={id}
                inputId={inputId}
                aria-label={a11yCombobox && ariaLabelledBy ? undefined : ariaLabel}
                aria-labelledby={a11yCombobox ? ariaLabelledBy : undefined}
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedBy}
                ref={(instance) => {
                  dropdown.current = instance
                  if (typeof ref === 'function') ref(instance)
                  else if (ref) ref.current = instance
                }}
                inputRef={inputRef}
                name={name}
                value={value}
                options={enhancedOptions}
                onChange={handleChange}
                disabled={disabled}
                placeholder={placeholder}
                panelFooterTemplate={panelFooterTemplate}
                valueTemplate={valueTemplate}
                itemTemplate={ResolvedOptionTemplate}
                loading={loading}
                appendTo={appendTo}
                filter={filter}
                filterBy={filterBy}
                filterPlaceholder={filterPlaceholder}
                className={cn(
                  'h-8 gap-2 !px-2 text-sm flex text-text-primary justify-between items-center bg-surface-base-content border border-border-primary rounded-lg transition hover:border-border-secondary cursor-pointer',
                  !value && 'text-text-quaternary',
                  error && '!border-failed-secondary',
                  className
                )}
                panelClassName={cn(
                  'bg-surface-base-primary max-w-64 mt-2 border overflow-auto flex bg-surface-base-secondary border-border-specific-panel-outline p-1.5 rounded-lg flex flex-col',
                  panelClassName
                )}
                pt={{
                  root: (options) => options?.state.overlayVisible && '!border-border-secondary',
                  wrapper: { className: 'order-2' },
                  item: {
                    className: cn('text-sm focus-visible:ring-0 !p-0 rounded-md cursor-pointer'),
                  },
                  input: (opts) => ({
                    className: cn(
                      'text-ellipsis overflow-hidden text-text-primary',
                      classNameValue
                    ),
                    ...(a11yCombobox && {
                      role: 'combobox',
                      'aria-expanded': !!opts?.state?.overlayVisible,
                      'aria-controls': opts?.state?.overlayVisible ? listId : undefined,
                    }),
                  }),
                  trigger: {
                    className: cn('text-text-primary', classNameValue),
                    ...(a11yCombobox && { 'aria-hidden': true }),
                  },
                  ...(a11yCombobox && { list: { id: listId, 'aria-label': listboxLabel } }),
                  footer: { className: 'order-1' },
                  clearIcon: { className: 'focus:outline-none' },
                }}
                collapseIcon={<ChevronDownSvg className="text-text-secondary" />}
                dropdownIcon={<ChevronDownSvg className="text-text-secondary" />}
              />
            </div>
          )}
        </FieldAnnouncer>
        {a11yCombobox && <output className="sr-only">{announcement}</output>}
      </div>
    )
  }
) as <TValue extends string | number | null = string | number | null>(
  props: SelectProps<TValue> & { ref?: Ref<Dropdown> }
) => React.ReactElement

export default Select
