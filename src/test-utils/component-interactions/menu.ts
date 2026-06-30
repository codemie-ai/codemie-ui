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
import { expect } from 'vitest'

import type { InteractionOptions } from './types'

/**
 * Opens a context menu and clicks a menu item
 *
 * Useful for testing dropdown menus, context menus, and action menus in integration tests.
 * Waits for the menu to open before attempting to click the menu item.
 *
 * @param buttonName - The accessible name of the button that opens the menu
 * @param menuItemName - The accessible name of the menu item to click
 * @param user - Optional userEvent instance (defaults to userEvent.setup())
 * @param options - Optional waitFor configuration
 *
 * @example
 * // Open "More options" menu and click "Delete"
 * const user = userEvent.setup()
 * await clickMenuOption('More options', 'Delete', user)
 *
 * @example
 * // With custom waitFor options
 * await clickMenuOption('Actions', 'Edit', user, { timeout: 5000 })
 */
export async function clickMenuOption(
  buttonName: string,
  menuItemName: string,
  user?: ReturnType<typeof userEvent.setup>,
  options?: InteractionOptions
): Promise<void> {
  const userInstance = user ?? userEvent.setup()

  const menuButton = screen.getByRole('button', { name: buttonName })
  await userInstance.click(menuButton)

  await waitFor(() => {
    expect(screen.getByRole('menuitem', { name: menuItemName })).toBeInTheDocument()
  }, options)

  await userInstance.click(screen.getByRole('menuitem', { name: menuItemName }))
}
