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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'
import {
  getAutocomplete,
  openAutocompleteDropdown,
  findAutocompleteOption,
} from '@/test-utils/component-interactions/autocomplete'

import DataSourceTypeSelector from '../DataSourceTypeSelector'

describe('DataSourceTypeSelector dark-theme focus regression (EPMCDME-14856)', () => {
  it('keeps the selected item on the selected-token class after the Description field steals focus and the dropdown reopens', async () => {
    const user = userEvent.setup()

    render(
      <>
        <DataSourceTypeSelector
          clearErrors={() => {}}
          indexType={INDEX_TYPES.GIT}
          onIndexTypeChange={() => {}}
          indexMetadata={{}}
          onIndexMetadataChange={() => {}}
        />
        <textarea aria-label="Description" />
      </>
    )

    const autocomplete = await getAutocomplete('Datasource Type')
    await openAutocompleteDropdown(autocomplete, user)
    const firstOpenItem = await findAutocompleteOption('Git')
    expect(firstOpenItem.className).toContain('bg-surface-specific-dropdown-focused')
    expect(firstOpenItem.className).not.toContain('bg-surface-base-navigation')

    // Description field steals focus — mirrors clicking the Description
    // textarea while the Datasource Type dropdown is open.
    await user.click(screen.getByLabelText('Description'))

    await openAutocompleteDropdown(autocomplete, user)
    const reopenedItem = await findAutocompleteOption('Git')

    expect(reopenedItem.className).toContain('bg-surface-specific-dropdown-focused')
    expect(reopenedItem.className).not.toContain('bg-surface-base-navigation')
    expect(reopenedItem.className).not.toMatch(/p-highlight|p-focus/)
  })
})
