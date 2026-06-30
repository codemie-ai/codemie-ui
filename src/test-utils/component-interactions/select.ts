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
 * Finds a Select (Dropdown) component by label or placeholder (async with waitFor)
 */
export async function getSelect(
  identifier: ComponentIdentifier,
  options?: InteractionOptions
): Promise<HTMLElement> {
  return waitFor(() => getSelectSync(identifier), options)
}

/**
 * Finds a Select (Dropdown) component by label or placeholder (sync, throws if not found)
 */
export function getSelectSync(identifier: ComponentIdentifier): HTMLElement {
  const byLabelText = findSelectByLabelText(identifier)
  if (byLabelText) return byLabelText

  const byPlaceholder = findSelectByPlaceholder(identifier)
  if (byPlaceholder) return byPlaceholder

  throw new Error(`Could not find Select with identifier: ${String(identifier)}`)
}

function findSelectByLabelText(identifier: ComponentIdentifier): HTMLElement | null {
  const labelText = typeof identifier === 'string' ? identifier : undefined
  if (!labelText) return null

  try {
    const label = screen.getByText(labelText, { selector: 'label' })
    const forId = label.getAttribute('for')
    if (forId) {
      const dropdown = document.getElementById(forId)
      if (dropdown?.classList.contains('p-dropdown')) {
        return dropdown
      }
    }

    const container = label.closest('.flex.flex-col')
    const dropdown = container?.querySelector('.p-dropdown')
    if (dropdown) return dropdown as HTMLElement
  } catch {
    // Continue to next strategy
  }
  return null
}

function findSelectByPlaceholder(identifier: ComponentIdentifier): HTMLElement | null {
  const dropdowns = document.querySelectorAll('.p-dropdown')
  for (const dropdown of Array.from(dropdowns)) {
    const label = dropdown.querySelector('.p-dropdown-label')
    if (label?.textContent) {
      const text = label.textContent.trim()
      if (matchesIdentifier(text, identifier)) {
        return dropdown as HTMLElement
      }
    }
  }
  return null
}

/**
 * Opens a Select dropdown
 */
export async function openSelectDropdown(
  element: HTMLElement,
  user?: ReturnType<typeof userEvent.setup>
): Promise<void> {
  const userInstance = user ?? userEvent.setup()

  await userInstance.click(element)

  // Wait for panel to appear
  await waitFor(() => {
    const panel = document.querySelector('.p-dropdown-panel')
    if (!panel) throw new Error('Select panel did not open')
  })
}

/**
 * Finds an option in the currently open Select panel by text
 */
export async function findSelectOption(
  optionText: string,
  options?: InteractionOptions
): Promise<HTMLElement> {
  return waitFor(() => {
    const panel = document.querySelector('.p-dropdown-panel')
    if (!panel) throw new Error('Select panel is not open')

    const items = panel.querySelectorAll('.p-dropdown-item')

    for (const item of Array.from(items)) {
      if (item.textContent?.includes(optionText)) {
        return item as HTMLElement
      }
    }

    throw new Error(`Could not find option with text: ${optionText}`)
  }, options)
}

/**
 * High-level helper: Opens Select, selects option, and closes dropdown
 */
export async function selectDropdownOption(
  identifier: ComponentIdentifier,
  optionLabel: string,
  options?: InteractionOptions
): Promise<void> {
  const userInstance = options?.user ?? userEvent.setup()
  const element = await getSelect(identifier, options)

  await openSelectDropdown(element, userInstance)

  const option = await findSelectOption(optionLabel, options)
  await userInstance.click(option)

  // Wait for panel to close
  await waitFor(() => {
    const panel = document.querySelector('.p-dropdown-panel')
    if (panel) throw new Error('Dropdown did not close after selection')
  })
}

/**
 * Gets the currently selected value from a Select
 */
export async function getSelectedDropdownValue(
  identifier: ComponentIdentifier,
  options?: InteractionOptions
): Promise<string | null> {
  const element = await getSelect(identifier, options)

  // Find the input element that displays the selected value
  const input = element.querySelector('.p-dropdown-label')
  if (!input) return null

  const text = input.textContent?.trim()
  // PrimeReact shows "empty" placeholder when nothing is selected
  if (!text || text === 'empty') return null

  return text
}
