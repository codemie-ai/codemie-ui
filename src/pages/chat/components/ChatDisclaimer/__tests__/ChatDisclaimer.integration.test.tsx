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

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import ChatDisclaimer from '../ChatDisclaimer'

vi.mock('@/hooks/useIsTruncated', () => ({ useIsTruncated: () => false }))

// The unit suite mocks valtio without reactivity, which cannot catch a component that
// subscribes to nothing. This suite runs against the real proxy.
describe('ChatDisclaimer reactivity', () => {
  beforeEach(() => {
    appInfoStore.configs = []
  })

  afterEach(cleanup)

  it('appears when the config arrives after the first paint', async () => {
    render(<ChatDisclaimer />)
    expect(screen.queryByTestId('chat-disclaimer')).not.toBeInTheDocument()

    appInfoStore.configs = [{ id: 'chatDisclaimer', settings: { enabled: true, text: 'Verify information.' } }]

    await waitFor(() => expect(screen.getByTestId('chat-disclaimer')).toHaveTextContent('Verify information.'))
  })

  it('follows a later refetch without a reload', async () => {
    appInfoStore.configs = [{ id: 'chatDisclaimer', settings: { enabled: true, text: 'First notice.' } }]
    render(<ChatDisclaimer />)
    await waitFor(() => expect(screen.getByTestId('chat-disclaimer')).toHaveTextContent('First notice.'))

    appInfoStore.configs = [{ id: 'chatDisclaimer', settings: { enabled: true, text: 'Second notice.' } }]

    await waitFor(() => expect(screen.getByTestId('chat-disclaimer')).toHaveTextContent('Second notice.'))
  })

  it('disappears when the setting is turned off', async () => {
    appInfoStore.configs = [{ id: 'chatDisclaimer', settings: { enabled: true, text: 'Visible.' } }]
    render(<ChatDisclaimer />)
    await waitFor(() => expect(screen.getByTestId('chat-disclaimer')).toBeInTheDocument())

    appInfoStore.configs = [{ id: 'chatDisclaimer', settings: { enabled: false, text: 'Visible.' } }]

    await waitFor(() => expect(screen.queryByTestId('chat-disclaimer')).not.toBeInTheDocument())
  })
})
