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
 * Finds an Autocomplete component by label or placeholder (async with waitFor)
 */
export async function getAutocomplete(
  identifier: ComponentIdentifier,
  options?: InteractionOptions
): Promise<HTMLElement> {
  return waitFor(() => getAutocompleteSync(identifier), options)
}

/**
 * Finds an Autocomplete component by label or placeholder (sync, throws if not found)
 */
export function getAutocompleteSync(identifier: ComponentIdentifier): HTMLElement {
  const byLabelText = findAutocompleteByLabelText(identifier)
  if (byLabelText) return byLabelText

  const byPlaceholder = findAutocompleteByPlaceholder(identifier)
  if (byPlaceholder) return byPlaceholder

  throw new Error(`Could not find Autocomplete with identifier: ${String(identifier)}`)
}

function findAutocompleteByLabelText(identifier: ComponentIdentifier): HTMLElement | null {
  const labelText = typeof identifier === 'string' ? identifier : undefined
  if (!labelText) return null

  try {
    const label = screen.getByText(labelText, { selector: 'label' })
    const forId = label.getAttribute('for')
    if (forId) {
      const input = document.getElementById(forId)
      const autocomplete = input?.closest('.p-autocomplete')
      if (autocomplete) return autocomplete as HTMLElement
    }

    const container = label.closest('.flex.flex-col')
    const autocomplete = container?.querySelector('.p-autocomplete')
    if (autocomplete) return autocomplete as HTMLElement
  } catch {
    // Continue to next strategy
  }
  return null
}

function findAutocompleteByPlaceholder(identifier: ComponentIdentifier): HTMLElement | null {
  const inputs = document.querySelectorAll('.p-autocomplete-input')
  for (const input of Array.from(inputs)) {
    const placeholder = input.getAttribute('placeholder')
    if (placeholder && matchesIdentifier(placeholder, identifier)) {
      const autocomplete = input.closest('.p-autocomplete')
      if (autocomplete) return autocomplete as HTMLElement
    }
  }
  return null
}

/**
 * Opens an Autocomplete dropdown by clicking the input (triggers focus → auto-search)
 */
export async function openAutocompleteDropdown(
  element: HTMLElement,
  user?: ReturnType<typeof userEvent.setup>
): Promise<void> {
  const userInstance = user ?? userEvent.setup()

  const input = element.querySelector<HTMLElement>('.p-autocomplete-input')
  if (!input) throw new Error('Could not find Autocomplete input element')

  await userInstance.click(input)

  // PrimeReact sets aria-expanded="true" on the input when the panel is open
  await waitFor(() => {
    const inp = element.querySelector('.p-autocomplete-input')
    if (inp?.getAttribute('aria-expanded') !== 'true') {
      throw new Error('Autocomplete panel did not open')
    }
  })
}

/**
 * Finds an option in the currently open Autocomplete panel by text
 */
export async function findAutocompleteOption(
  optionText: string,
  options?: InteractionOptions
): Promise<HTMLElement> {
  return waitFor(() => {
    const panel = document.querySelector('.p-autocomplete-panel')
    if (!panel) throw new Error('Autocomplete panel is not open')

    // PrimeReact's passthrough preset overrides base classes; items are identified by data-pc-section
    const items = panel.querySelectorAll('[data-pc-section="item"]')

    for (const item of Array.from(items)) {
      if (item.textContent?.includes(optionText)) {
        return item as HTMLElement
      }
    }

    throw new Error(`Could not find option with text: ${optionText}`)
  }, options)
}

/**
 * High-level helper: Opens Autocomplete, selects an option, waits for panel to close
 */
export async function selectAutocompleteOption(
  identifier: ComponentIdentifier,
  optionLabel: string,
  options?: InteractionOptions
): Promise<void> {
  const userInstance = options?.user ?? userEvent.setup()
  const element = await getAutocomplete(identifier, options)

  await openAutocompleteDropdown(element, userInstance)

  const option = await findAutocompleteOption(optionLabel, options)
  await userInstance.click(option)

  // PrimeReact sets aria-expanded="false" on the input when the panel closes
  // (the panel element stays in the DOM with display:none, so checking existence is unreliable)
  await waitFor(() => {
    const inp = element.querySelector('.p-autocomplete-input')
    if (inp?.getAttribute('aria-expanded') === 'true') {
      throw new Error('Autocomplete panel did not close after selection')
    }
  })
}

/**
 * Types into an Autocomplete input to filter suggestions
 */
export async function typeInAutocomplete(
  identifier: ComponentIdentifier,
  text: string,
  options?: InteractionOptions
): Promise<void> {
  const userInstance = options?.user ?? userEvent.setup()
  const element = await getAutocomplete(identifier, options)

  const input = element.querySelector<HTMLInputElement>('.p-autocomplete-input')
  if (!input) throw new Error('Could not find Autocomplete input element')

  await userInstance.clear(input)
  await userInstance.type(input, text)
}

/**
 * Gets the current text value displayed in the Autocomplete input
 */
export async function getAutocompleteInputValue(
  identifier: ComponentIdentifier,
  options?: InteractionOptions
): Promise<string | null> {
  const element = await getAutocomplete(identifier, options)
  const input = element.querySelector<HTMLInputElement>('.p-autocomplete-input')
  return input?.value ?? null
}
