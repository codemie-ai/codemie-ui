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

import { MultiSelectChangeEvent } from 'primereact/multiselect'
import React from 'react'

import XMarkSvg from '@/assets/icons/cross.svg?react'

interface ChipWrapperProps {
  option: unknown
  selectedItemTemplate: ((option: unknown) => React.ReactNode) | null | undefined
  preparedValue: unknown[]
  onChange: (e: MultiSelectChangeEvent) => void
  label?: string
  disabled?: boolean
}

// Keys commonly holding a human-readable name on object options (custom `optionLabel`s aside).
const OPTION_TEXT_KEYS = ['label', 'name', 'display_name', 'title', 'value', 'id'] as const

const textOf = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'label' in value) return textOf(value.label)
  return ''
}

/** Text of a chip option that is not in the current options list (e.g. filtered out). */
const describeOption = (option: unknown): string => {
  if (option && typeof option === 'object') {
    const record = option as Record<string, unknown>
    return OPTION_TEXT_KEYS.map((key) => textOf(record[key])).find(Boolean) ?? ''
  }
  return textOf(option)
}

/** Plain text rendered by a selected-item template (strings and element children). */
const renderedText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(renderedText).join('')
  if (React.isValidElement<{ children?: React.ReactNode }>(node))
    return renderedText(node.props.children)
  return ''
}

export const ChipWrapper: React.FC<ChipWrapperProps> = ({
  option,
  selectedItemTemplate,
  preparedValue,
  onChange,
  label,
  disabled = false,
}) => {
  if (!option) return null

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    const newValues = preparedValue.filter((v) => v !== option)
    onChange({ value: newValues, target: { value: newValues } } as MultiSelectChangeEvent)
  }

  const optionText = describeOption(option)
  const isObject = typeof option === 'object'
  const content = selectedItemTemplate ? (
    selectedItemTemplate(option)
  ) : (
    <span>{isObject ? optionText : String(option as string | number | boolean)}</span>
  )
  // The option's label when it is in the list, else what the template shows, else the option.
  const templateText = selectedItemTemplate ? renderedText(content).trim() : ''
  const name = label?.trim() || templateText || optionText

  return (
    <span className="inline-flex items-center gap-1.5 py-0.5 px-2 h-7 rounded-lg border border-border-structural bg-surface-base-secondary text-text-primary font-geist-mono text-xs leading-6 font-semibold cursor-default">
      {content}
      <button
        type="button"
        aria-label={name ? `Remove ${name}` : 'Remove selected item'}
        disabled={disabled}
        className="ml-2 inline-flex rounded-md transition duration-200 ease-in-out hover:text-text-quaternary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-secondary disabled:cursor-default"
        onClick={handleRemove}
      >
        <XMarkSvg className="w-4 h-4" aria-hidden="true" />
      </button>
    </span>
  )
}
