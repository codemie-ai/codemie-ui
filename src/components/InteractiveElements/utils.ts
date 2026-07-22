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

import type {
  CheckBoxElement,
  DatePickerElement,
  DropdownElement,
  InteractiveElement,
  TextFieldElement,
} from '@/types/entity/interactive'

import type { AnswerableElement } from './elementHandlers/types'

const MAX_REGEX_PATTERN_LEN = 512
// Mirror the server field-value cap: JS RegExp has no match-time timeout, so we never
// run an agent-authored pattern against an unbounded value on the main thread.
const MAX_REGEX_INPUT_LEN = 4096
// Linear-time email check: the label before the required dot excludes "." ([^@\s.]),
// so no quantified group overlaps the "." separator — the match cannot backtrack.
const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/
// Crude signature of the classic catastrophic-backtracking shapes ((x+)+, (x*)*,
// (x+)*, …): a quantifier immediately closing a group that is itself quantified.
// The common prefix is factored out so the detector itself stays linear-time.
const NESTED_QUANTIFIER_RE = /[+*]\s*\)\s*(?:[+*?]|\{)/

/** Compile an agent-authored regex defensively, anchored as a full-string match to
 *  mirror the server's re.fullmatch semantics. Returns null (skip client-side format
 *  validation, deferring to the authoritative server) for oversized, uncompilable, or
 *  likely-catastrophic patterns — the server bounds those with a real match timeout. */
export const safeRegex = (pattern: string): RegExp | null => {
  if (pattern.length > MAX_REGEX_PATTERN_LEN) return null
  if (NESTED_QUANTIFIER_RE.test(pattern)) return null
  try {
    return new RegExp(`^(?:${pattern})$`)
  } catch {
    return null
  }
}

export const validateTextField = (field: TextFieldElement, value: string): string | null => {
  const v = value ?? ''
  if (field.validation?.required && v.trim() === '') return `${field.label} is required`
  if (v === '') return null
  if (field.validation?.email && !EMAIL_RE.test(v)) return 'Must be a valid email'
  // Only run the pattern against a bounded input; longer values defer to the server.
  if (field.validation?.regex && v.length <= MAX_REGEX_INPUT_LEN) {
    const compiled = safeRegex(field.validation.regex)
    if (compiled && !compiled.test(v)) return `${field.label} does not match the required format`
  }
  return null
}

export const validateCheckbox = (checkbox: CheckBoxElement, checked: boolean): string | null => {
  if (checkbox.validation?.required && !checked) return `${checkbox.label} is required`
  return null
}

export const validateDropdown = (element: DropdownElement, value: string): string | null => {
  const v = value ?? ''
  if (element.required && v === '') return `${element.label} is required`
  if (v === '') return null
  if (!element.options.some((option) => option.value === v))
    return `${element.label} has an invalid selection`
  return null
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Client-side validation for one date picker value (ISO YYYY-MM-DD); mirrors the
 *  server's format + inclusive min/max range checks. Returns an error or null. */
export const validateDate = (element: DatePickerElement, value: string): string | null => {
  const v = value ?? ''
  if (element.required && v === '') return `${element.label} is required`
  if (v === '') return null
  if (!ISO_DATE_RE.test(v) || Number.isNaN(Date.parse(v)))
    return `${element.label} must be a valid date`
  if (element.min && v < element.min) return `${element.label} must be on or after ${element.min}`
  if (element.max && v > element.max) return `${element.label} must be on or before ${element.max}`
  return null
}

/** Depth-first collect of all elements of a given type from a surface tree.
 *  Defensive against malformed wire data: non-array `elements`/`children` are
 *  treated as empty rather than throwing (the surface is agent-authored). */
export const collectElements = (
  elements: InteractiveElement[],
  type: InteractiveElement['type']
): InteractiveElement[] => {
  const found: InteractiveElement[] = []
  if (!Array.isArray(elements)) return found
  for (const element of elements) {
    if (element?.type === type) found.push(element)
    if (element && 'children' in element && Array.isArray(element.children)) {
      found.push(...collectElements(element.children, type))
    }
  }
  return found
}

/** Depth-first flat list of every element in a surface tree (layout order). */
export const collectAllElements = (elements: InteractiveElement[]): InteractiveElement[] => {
  const found: InteractiveElement[] = []
  if (!Array.isArray(elements)) return found
  for (const element of elements) {
    if (element) found.push(element)
    if (element && 'children' in element && Array.isArray(element.children)) {
      found.push(...collectAllElements(element.children))
    }
  }
  return found
}

/** Type guard: an element that contributes a value/selection to the combined answer. */
export const isInputElement = (element: InteractiveElement): element is AnswerableElement =>
  element.type === 'multiple_choice' ||
  element.type === 'dropdown' ||
  element.type === 'date_picker' ||
  element.type === 'text_field' ||
  element.type === 'checkbox'

/** Normalize an agent-authored label for the summary chip: drop a leading check mark /
 *  whitespace and a trailing colon so joining never yields "✓ ✓" or "::". */
export const cleanLabel = (label: string): string => {
  const withoutLead = String(label ?? '').replace(/^[\s✓✔]+/, '')
  // Strip a trailing run of whitespace / colons by scanning from the end (linear)
  // rather than a `[…]+$` regex, which Sonar flags as potentially super-linear.
  let end = withoutLead.length
  while (end > 0 && /[\s:]/.test(withoutLead[end - 1])) end -= 1
  return withoutLead.slice(0, end)
}

/** A surface acts as a form when it contains any input field elements. */
export const isFormSurface = (elements: InteractiveElement[]): boolean =>
  collectElements(elements, 'text_field').length > 0 ||
  collectElements(elements, 'checkbox').length > 0
