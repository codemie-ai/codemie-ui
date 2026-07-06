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
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { selectAutocompleteOption } from '@/test-utils/component-interactions'
import { renderPage, mockAPI } from '@/test-utils/integration'

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

const suppressUnhandledRejection = () => {
  const vitestHandlers = process.listeners('unhandledRejection')
  process.removeAllListeners('unhandledRejection')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  process.on('unhandledRejection', () => {})
  return () => {
    process.removeAllListeners('unhandledRejection')
    for (const h of vitestHandlers) {
      process.on('unhandledRejection', h)
    }
  }
}

const mockFormInitAPIs = () => {
  mockAPI('GET', 'v1/providers/datasource_schemas', [])
}

const waitForFormReady = async () => {
  await waitFor(
    () => {
      expect(screen.getByText('Datasource Type')).toBeInTheDocument()
    },
    { timeout: 10000 }
  )
}

const selectGoogleDocsType = async (user: ReturnType<typeof userEvent.setup>) => {
  await selectAutocompleteOption('Datasource Type', 'Google', { user })
}

describe('DataSourceCreatePage - Google Docs Integration', () => {
  let restoreUnhandledRejection: (() => void) | null = null

  beforeEach(() => {
    mockFormInitAPIs()
  })

  afterEach(() => {
    restoreUnhandledRejection?.()
    restoreUnhandledRejection = null
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows Google Auth Integration section after selecting Google Docs datasource type', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectGoogleDocsType(user)
    await waitFor(() => {
      expect(screen.getByText('Google Docs Link')).toBeInTheDocument()
    })
  })

  it('shows integration required error when saving Google Docs without selecting an integration', async () => {
    restoreUnhandledRejection = suppressUnhandledRejection()
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectGoogleDocsType(user)

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'My Google Source')

    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(descInput)
    await user.type(descInput, 'A Google Docs datasource')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(
        screen.getByText('Integration is required for this data source type')
      ).toBeInTheDocument()
    })
  })
})
