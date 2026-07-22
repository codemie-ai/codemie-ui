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

import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import DatePicker from '@/components/form/DatePicker'
import Input from '@/components/form/Input/Input'
import RadioButton from '@/components/form/RadioButton'
import Select from '@/components/form/Select'
import {
  cleanLabel,
  validateCheckbox,
  validateDate,
  validateDropdown,
  validateTextField,
} from '@/components/InteractiveElements/utils'
import { ButtonSize, ButtonType } from '@/constants'
import type {
  ButtonElement,
  CheckBoxElement,
  DatePickerElement,
  DropdownElement,
  InteractiveElement,
  MultipleChoiceElement,
  TextFieldElement,
} from '@/types/entity/interactive'

import type { ElementHandler, HandlerMap, SurfaceContext } from './types'

const BUTTON_TYPE_BY_STYLE: Record<string, ButtonType> = {
  primary: ButtonType.PRIMARY,
  secondary: ButtonType.SECONDARY,
  danger: ButtonType.DELETE,
}

const optionLabel = (options: { value: string; label: string }[], value: string): string =>
  options.find((o) => o.value === value)?.label ?? value

// --- value accessors typed per bucket (each handler reads its own shape) ---
const selectionOf = (ctx: SurfaceContext, id: string): string[] =>
  (ctx.getValue(id) as string[]) ?? []
const textOf = (ctx: SurfaceContext, id: string): string => (ctx.getValue(id) as string) ?? ''
const boolOf = (ctx: SurfaceContext, id: string): boolean => Boolean(ctx.getValue(id))
const priorSelection = (answer: unknown): unknown =>
  Array.isArray((answer as { selected?: unknown })?.selected)
    ? (answer as { selected: string[] }).selected
    : undefined
const priorValue = (answer: unknown, wanted: 'string' | 'boolean'): unknown => {
  const value = (answer as { value?: unknown })?.value
  const actual = typeof value
  return actual === wanted ? value : undefined
}

const choiceCap = (element: MultipleChoiceElement): number =>
  Number.isInteger(element.max_allowed_selections) && element.max_allowed_selections >= 1
    ? element.max_allowed_selections
    : 1

export const choiceHandler: ElementHandler<MultipleChoiceElement> = {
  render: (element, key, ctx) => {
    const options = Array.isArray(element.options) ? element.options : []
    const cap = choiceCap(element)
    const selected = selectionOf(ctx, element.id)
    if (cap <= 1) {
      return (
        <div key={key} className="flex flex-col gap-2" role="radiogroup">
          {options.map((option) => (
            <RadioButton
              key={option.value}
              label={option.label}
              name={element.id}
              value={option.value}
              checked={selected.includes(option.value)}
              disabled={ctx.disabled}
              onChange={() => !ctx.disabled && ctx.setValue(element.id, [option.value])}
            />
          ))}
        </div>
      )
    }
    const atCap = selected.length >= cap
    return (
      <div key={key} className="flex flex-col gap-2">
        {options.map((option) => {
          const isChecked = selected.includes(option.value)
          return (
            <Checkbox
              key={option.value}
              label={option.label}
              checked={isChecked}
              disabled={ctx.disabled || (!isChecked && atCap)}
              onChange={(checked) =>
                !ctx.disabled &&
                ctx.setValue(
                  element.id,
                  checked ? [...selected, option.value] : selected.filter((v) => v !== option.value)
                )
              }
            />
          )
        })}
      </div>
    )
  },
  seed: priorSelection,
  answer: (element, ctx) => ({ selected: selectionOf(ctx, element.id) }),
  summary: (element, ctx) => {
    const labels = selectionOf(ctx, element.id).map((v) => optionLabel(element.options ?? [], v))
    return labels.length ? labels.join(', ') : null
  },
}

export const dropdownHandler: ElementHandler<DropdownElement> = {
  render: (element, key, ctx) => (
    <Select
      key={key}
      id={`interactive-${element.id}`}
      label={element.label}
      placeholder={element.placeholder}
      options={(Array.isArray(element.options) ? element.options : []).map((option) => ({
        label: option.label,
        value: option.value,
      }))}
      value={textOf(ctx, element.id)}
      required={element.required}
      disabled={ctx.disabled}
      error={ctx.errors[element.id]}
      onChangeValue={(value) => ctx.setValue(element.id, value == null ? '' : String(value))}
    />
  ),
  seed: (answer) => priorValue(answer, 'string'),
  validate: (element, ctx) => validateDropdown(element, textOf(ctx, element.id)),
  answer: (element, ctx) => ({ value: textOf(ctx, element.id) }),
  summary: (element, ctx) => {
    const v = textOf(ctx, element.id)
    return v ? `${cleanLabel(element.label)}: ${optionLabel(element.options ?? [], v)}` : null
  },
}

export const datePickerHandler: ElementHandler<DatePickerElement> = {
  render: (element, key, ctx) => (
    <DatePicker
      key={key}
      id={`interactive-${element.id}`}
      label={element.label}
      value={textOf(ctx, element.id) || null}
      minDate={element.min ?? undefined}
      maxDate={element.max ?? undefined}
      required={element.required}
      disabled={ctx.disabled}
      error={ctx.errors[element.id]}
      onChange={(value) => ctx.setValue(element.id, value ? value.slice(0, 10) : '')}
    />
  ),
  seed: (answer) => priorValue(answer, 'string'),
  validate: (element, ctx) => validateDate(element, textOf(ctx, element.id)),
  answer: (element, ctx) => ({ value: textOf(ctx, element.id) }),
  summary: (element, ctx) => {
    const v = textOf(ctx, element.id)
    return v ? `${cleanLabel(element.label)}: ${v}` : null
  },
}

export const textFieldHandler: ElementHandler<TextFieldElement> = {
  render: (element, key, ctx) => (
    <Input
      key={key}
      id={`interactive-${element.id}`}
      label={element.label}
      value={textOf(ctx, element.id)}
      disabled={ctx.disabled}
      required={element.validation?.required}
      error={ctx.errors[element.id]}
      onChange={(e) => ctx.setValue(element.id, e.target.value)}
    />
  ),
  seed: (answer) => priorValue(answer, 'string'),
  validate: (element, ctx) => validateTextField(element, textOf(ctx, element.id)),
  answer: (element, ctx) => ({ value: textOf(ctx, element.id) }),
  summary: (element, ctx) => {
    const v = textOf(ctx, element.id)
    return v ? `${cleanLabel(element.label)}: ${v}` : null
  },
}

export const checkboxHandler: ElementHandler<CheckBoxElement> = {
  render: (element, key, ctx) => (
    <Checkbox
      key={key}
      label={element.label}
      checked={boolOf(ctx, element.id)}
      disabled={ctx.disabled}
      error={ctx.errors[element.id]}
      onChange={(checked) => ctx.setValue(element.id, checked)}
    />
  ),
  seed: (answer) => priorValue(answer, 'boolean'),
  validate: (element, ctx) => validateCheckbox(element, boolOf(ctx, element.id)),
  answer: (element, ctx) => ({ value: boolOf(ctx, element.id) }),
  summary: (element, ctx) => (boolOf(ctx, element.id) ? cleanLabel(element.label) : null),
}

export const buttonHandler: ElementHandler<ButtonElement> = {
  render: (element, key, ctx) => {
    const isSelected = ctx.submittedAction === element.id
    return (
      <span
        key={key}
        {...(isSelected ? { 'data-testid': `interactive-selected-${element.id}` } : {})}
      >
        <Button
          type={BUTTON_TYPE_BY_STYLE[element.style ?? 'primary'] ?? ButtonType.PRIMARY}
          size={ButtonSize.SMALL}
          disabled={ctx.disabled}
          onClick={() => ctx.submit(element.id)}
        >
          {element.label}
        </Button>
      </span>
    )
  },
}

export const textHandler: ElementHandler = {
  render: (element, key) =>
    element.type === 'text' ? (
      <p key={key} className="text-sm text-text-primary">
        {element.content}
      </p>
    ) : null,
}

export const columnHandler: ElementHandler = {
  render: (element, key, ctx) =>
    element.type === 'column' ? (
      <div key={key} className="flex flex-col gap-2">
        {(element.children ?? []).map((child, i) => ctx.renderChild(child, `${key}-${i}`))}
      </div>
    ) : null,
}

export const rowHandler: ElementHandler = {
  render: (element, key, ctx) =>
    element.type === 'row' ? (
      <div key={key} className="flex flex-row flex-wrap gap-2">
        {(element.children ?? []).map((child, i) => ctx.renderChild(child, `${key}-${i}`))}
      </div>
    ) : null,
}

export const ELEMENT_HANDLERS: HandlerMap = {
  text: textHandler,
  column: columnHandler,
  row: rowHandler,
  button: buttonHandler,
  multiple_choice: choiceHandler,
  dropdown: dropdownHandler,
  date_picker: datePickerHandler,
  text_field: textFieldHandler,
  checkbox: checkboxHandler,
}

// ELEMENT_HANDLERS[type] is picked by the element's own discriminant, so the handler
// always matches the element at runtime; the single cast asserts that correlation
// (TS cannot prove it for a union-typed key) and centralizes what used to be a
// scattered `element as never` at every call site.
export const getElementHandler = (
  type: InteractiveElement['type']
): ElementHandler<InteractiveElement> =>
  ELEMENT_HANDLERS[type] as ElementHandler<InteractiveElement>
