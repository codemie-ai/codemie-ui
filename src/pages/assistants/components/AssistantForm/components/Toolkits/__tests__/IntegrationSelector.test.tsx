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
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import IntegrationSelector from '../IntegrationSelector'

vi.mock('../IntegrationSelectDropdown', () => ({
  IntegrationSelectDropdown: () => <div data-testid="integration-dropdown" />,
}))

vi.mock('@/store/settings', () => ({ settingsStore: { settings: [] } }))

const AUTO_LABEL = /automatic credentials lookup/i

describe('author IntegrationSelector — Automatic Credentials Lookup', () => {
  afterEach(cleanup)

  const renderSelector = (settingsDefinitions: unknown[]) =>
    render(
      <IntegrationSelector
        value={undefined}
        settingsDefinitions={settingsDefinitions as never}
        showAutoCredentials
        onChange={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )

  it('offers the toggle even when the author has no integration of that type', () => {
    // The toggle decides whether credentials are looked up per consuming user; the author's own
    // list of integrations says nothing about that, so it must not hide the control.
    renderSelector([])

    expect(screen.getByText(AUTO_LABEL)).toBeTruthy()
  })

  it('offers the toggle when the author does have integrations', () => {
    renderSelector([{ id: 'int-1', alias: 'My Jira' }])

    expect(screen.getByText(AUTO_LABEL)).toBeTruthy()
  })

  it('hides the toggle where it is not requested', () => {
    render(
      <IntegrationSelector
        value={undefined}
        settingsDefinitions={[] as never}
        onChange={vi.fn()}
        onAddSettingClick={vi.fn()}
      />
    )

    expect(screen.queryByText(AUTO_LABEL)).toBeNull()
  })
})

describe('author IntegrationSelector — enabling auto lookup', () => {
  afterEach(cleanup)

  it('leaves clearing to the caller that persists the decision', async () => {
    // The persisting caller clears the integration in the same update; an extra onChange here would
    // rebuild the toolkit list from a stale snapshot and revert the flag it just stored.
    const onChange = vi.fn()
    const onAutoModeChange = vi.fn()

    render(
      <IntegrationSelector
        value={{ id: 'int-1', alias: 'My Jira' } as never}
        settingsDefinitions={[{ id: 'int-1', alias: 'My Jira' }] as never}
        showAutoCredentials
        onChange={onChange}
        onAddSettingClick={vi.fn()}
        onAutoModeChange={onAutoModeChange}
      />
    )

    await userEvent.click(screen.getByRole('switch'))

    expect(onAutoModeChange).toHaveBeenCalledWith(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('still clears the value when nobody persists the decision', async () => {
    const onChange = vi.fn()

    render(
      <IntegrationSelector
        value={{ id: 'int-1', alias: 'My Jira' } as never}
        settingsDefinitions={[{ id: 'int-1', alias: 'My Jira' }] as never}
        showAutoCredentials
        onChange={onChange}
        onAddSettingClick={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('switch'))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
