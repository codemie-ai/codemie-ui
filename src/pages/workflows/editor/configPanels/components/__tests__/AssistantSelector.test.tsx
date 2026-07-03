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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { forwardRef } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { Assistant } from '@/types/entity/assistant'

import AssistantSelector from '../AssistantSelector'

const { mockAssistantsStore } = vi.hoisted(() => ({
  mockAssistantsStore: {
    indexAssistants: vi.fn(),
    getAssistant: vi.fn(),
  },
}))

vi.mock('@/store/assistants', () => ({
  assistantsStore: mockAssistantsStore,
}))

// The dropdown itself is not under test here — stub it so the suite focuses on the
// "View Assistant" action wiring without pulling in the PrimeReact virtual scroller.
vi.mock('@/components/form/MultiSelect', () => ({
  default: forwardRef(() => <div data-testid="assistant-multiselect" />),
}))

// A fully-loaded assistant carrying project + slug, so getAssistantLink yields the
// human-readable `/assistants/{project}/{slug}` form.
const loadedAssistant = {
  id: 'asst-1',
  name: 'View Me',
  slug: 'view-slug',
  project: 'view-proj',
} as Assistant

describe('AssistantSelector - View Assistant', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockAssistantsStore.indexAssistants.mockResolvedValue([])
    vi.stubGlobal('open', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const renderSelector = () =>
    render(
      <AssistantSelector
        assistantConfig={{ id: 'node-1', assistant_id: 'asst-1' }}
        onAssistantConfigUpdate={vi.fn()}
      />
    )

  it('opens the human-readable assistant URL in a new tab when clicked', async () => {
    mockAssistantsStore.getAssistant.mockResolvedValue(loadedAssistant)

    renderSelector()

    const button = await screen.findByRole('button', { name: /View Assistant/ })
    await waitFor(() => expect(button).toBeEnabled())

    await user.click(button)

    expect(window.open).toHaveBeenCalledWith(
      expect.stringMatching(/\/assistants\/view-proj\/view-slug$/),
      '_blank'
    )
  })

  it('stays disabled and opens nothing while the selected assistant is unavailable', async () => {
    // Store resolves without an assistant (still loading / not found) — there is no
    // data to build a link from, so the button must not silently no-op on click.
    mockAssistantsStore.getAssistant.mockResolvedValue(undefined)

    renderSelector()

    const button = await screen.findByRole('button', { name: /View Assistant/ })
    expect(button).toBeDisabled()

    await user.click(button)

    expect(window.open).not.toHaveBeenCalled()
  })
})
