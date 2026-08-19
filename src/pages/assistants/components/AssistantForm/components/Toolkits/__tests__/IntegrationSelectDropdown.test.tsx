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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IntegrationSelectDropdown } from '../IntegrationSelectDropdown'

const ADD_BUTTON = /add user integration/i
const noop = vi.fn()

describe('IntegrationSelectDropdown — auto mode outranks the empty-list branch', () => {
  afterEach(cleanup)

  it('renders nothing in auto mode even when there are no integrations to choose from', () => {
    // Auto mode means the author picks nothing at all: neither the select nor the add button
    // belongs here. The empty-list branch used to run first and leave the button visible.
    render(
      <IntegrationSelectDropdown
        isAutoMode
        value={undefined}
        settingsDefinitions={[]}
        onChange={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: ADD_BUTTON })).toBeNull()
  })

  it('offers the add button while the author is choosing an integration', () => {
    render(
      <IntegrationSelectDropdown
        isAutoMode={false}
        value={undefined}
        settingsDefinitions={[]}
        onChange={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: ADD_BUTTON })).toBeTruthy()
  })
})

describe('IntegrationSelectDropdown — disabled prop', () => {
  afterEach(cleanup)

  it('shows the Add User Integration button even when disabled=true and settingsDefinitions is empty', () => {
    render(
      <IntegrationSelectDropdown
        isAutoMode={false}
        value={null}
        settingsDefinitions={[]}
        label="Integration"
        placeholder="Select integration"
        onChange={noop}
        onAddSettingClick={noop}
        disabled={true}
      />
    )
    // The button-only fallback must appear — it is the only way to add an integration
    expect(screen.getByRole('button', { name: /add user integration/i })).toBeInTheDocument()
    // No select/combobox when there are no options
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('still renders the add button (button-only view) when disabled=false and settingsDefinitions is empty', () => {
    render(
      <IntegrationSelectDropdown
        isAutoMode={false}
        value={null}
        settingsDefinitions={[]}
        onChange={noop}
        onAddSettingClick={noop}
      />
    )
    expect(screen.getByRole('button', { name: /add user integration/i })).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
