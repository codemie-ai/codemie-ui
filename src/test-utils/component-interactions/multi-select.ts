/* eslint-disable import/no-extraneous-dependencies */
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

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { matchesIdentifier } from './helpers'

import type { ComponentIdentifier, InteractionOptions } from './types'

/**
 * Finds a MultiSelect component by label or placeholder (async with waitFor)
 */
export async function getMultiSelect(
  identifier: ComponentIdentifier,
  options?: InteractionOptions
): Promise<HTMLElement> {
  return waitFor(() => getMultiSelectSync(identifier), options)
}

/**
 * Finds a MultiSelect component by label or placeholder (sync, throws if not found)
 */
export function getMultiSelectSync(identifier: ComponentIdentifier): HTMLElement {
  const byAriaLabel = findByAriaLabel(identifier)
  if (byAriaLabel) return byAriaLabel

  const byLabelText = findByLabelText(identifier)
  if (byLabelText) return byLabelText

  throw new Error(`Could not find MultiSelect with identifier: ${String(identifier)}`)
}

function findByAriaLabel(identifier: ComponentIdentifier): HTMLElement | null {
  const allElements = screen.queryAllByRole('combobox')
  for (const el of allElements) {
    const ariaLabel = el.getAttribute('aria-label')
    if (ariaLabel && matchesIdentifier(ariaLabel, identifier)) {
      const multiSelect = el.closest('.p-multiselect')
      if (multiSelect) return multiSelect as HTMLElement
    }
  }
  return null
}

function findByLabelText(identifier: ComponentIdentifier): HTMLElement | null {
  const labelText = typeof identifier === 'string' ? identifier : undefined
  if (!labelText) return null

  const labels = screen.queryAllByText(labelText)
  for (const label of labels) {
    if (label.className.includes('p-multiselect-label')) {
      const multiSelect = label.closest('.p-multiselect')
      if (multiSelect) return multiSelect as HTMLElement
    }
  }
  return null
}

/**
 * Opens a MultiSelect dropdown by clicking the label
 */
export async function openMultiSelectDropdown(
  element: HTMLElement,
  user?: ReturnType<typeof userEvent.setup>
): Promise<void> {
  const userInstance = user ?? userEvent.setup()
  const label = element.querySelector('.p-multiselect-label')

  if (!label) {
    throw new Error('Could not find MultiSelect label to click')
  }

  await userInstance.click(label)

  // Wait for panel to appear
  await waitFor(() => {
    const panel = document.querySelector('.p-multiselect-panel')
    if (!panel) throw new Error('MultiSelect panel did not open')
  })
}

/**
 * Closes the currently open dropdown via Escape key
 */
export async function closeDropdown(user?: ReturnType<typeof userEvent.setup>): Promise<void> {
  const userInstance = user ?? userEvent.setup()
  await userInstance.keyboard('{Escape}')

  // Wait for panel to disappear
  await waitFor(() => {
    const panel = document.querySelector('.p-multiselect-panel')
    if (panel) throw new Error('Dropdown did not close')
  })
}

/**
 * Finds an option in the currently open MultiSelect panel by text
 */
export async function findMultiSelectOption(
  optionText: string,
  options?: InteractionOptions
): Promise<HTMLElement> {
  return waitFor(() => {
    const panel = document.querySelector('.p-multiselect-panel')
    if (!panel) throw new Error('MultiSelect panel is not open')

    // Find all option items in the panel
    const items = panel.querySelectorAll('.p-multiselect-item')

    for (const item of Array.from(items)) {
      if (item.textContent?.includes(optionText)) {
        return item as HTMLElement
      }
    }

    throw new Error(`Could not find option with text: ${optionText}`)
  }, options)
}

/**
 * High-level helper: Opens MultiSelect, selects options, and closes dropdown
 */
// eslint-disable-next-line sonarjs/cognitive-complexity -- acceptable complexity for test utility
export async function selectMultiSelectOptions(
  identifier: ComponentIdentifier,
  optionLabels: string[],
  options?: InteractionOptions
): Promise<void> {
  const userInstance = options?.user ?? userEvent.setup()
  const element = await getMultiSelect(identifier, options)

  await openMultiSelectDropdown(element, userInstance)

  for (const label of optionLabels) {
    // eslint-disable-next-line no-await-in-loop -- sequential clicks required for UI interaction
    const option = await findMultiSelectOption(label, options)
    // eslint-disable-next-line no-await-in-loop -- sequential clicks required for UI interaction
    await userInstance.click(option)
  }

  if (options?.closeAfter !== false) {
    await closeDropdown(userInstance)
  }
}
