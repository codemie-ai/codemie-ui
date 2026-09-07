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

import { screen, waitFor, render, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { routes } from '@/router'
import { userSettingsStore } from '@/store/userSettings'
import {
  getAutocomplete,
  openAutocompleteDropdown,
  selectAutocompleteOption,
  selectDropdownOption,
} from '@/test-utils/component-interactions'
import { renderPage, mockAPI } from '@/test-utils/integration'

// fetch is typed as RequestInfo | URL. String() on a Request yields
// '[object Object]', so an .includes() match would silently never fire.
const requestUrl = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

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

const selectConfluenceType = async (user: ReturnType<typeof userEvent.setup>) => {
  await selectAutocompleteOption('Datasource Type', 'Confluence', { user })
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

describe('DataSourceCreatePage - Confluence Refresh Button', () => {
  beforeEach(() => {
    mockFormInitAPIs()
    mockAPI('GET', 'v1/settings/user/available', [])
    userSettingsStore.isSettingsIndexed = false
    userSettingsStore.settings = {}
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows no-integrations helper text and Refresh button after selecting Confluence type', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectConfluenceType(user)

    await waitFor(() => {
      expect(
        screen.getByText(/create a user integration, or refresh the list after one is added/i)
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })

  it('repopulates the dropdown after clicking Refresh when an integration becomes available', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectConfluenceType(user)

    await waitFor(() => {
      expect(
        screen.getByText(/create a user integration, or refresh the list after one is added/i)
      ).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/settings/user/available', [
      {
        id: 's-1',
        alias: 'My Confluence',
        credential_type: 'confluence',
        setting_type: 'user',
        project_name: null,
        is_global: true,
      },
    ])

    await user.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/choose an existing integration, or add a new one and refresh the list/i)
      ).toBeInTheDocument()
    })
  })
})

describe('DataSourceCreatePage — Unsaved Changes Guard', () => {
  beforeEach(() => {
    mockFormInitAPIs()
    mockAPI('GET', 'v1/settings/user/available', [])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not show unsaved-changes popup when navigating away from an untouched form', async () => {
    // The form defaults indexType to GIT and auto-generates a name on mount.
    // Before the fix, the auto-generated name made the form appear dirty even
    // though the user had not typed anything (regression: EPMCDME-14129).
    const router = createMemoryRouter(routes, {
      initialEntries: ['/data-sources/create'],
    })
    render(<RouterProvider router={router} />)

    await waitForFormReady()

    // Wait for the auto-generated name — signals name-fill is complete
    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: 'Name' })).not.toHaveValue('')
      },
      { timeout: 10000 }
    )

    // Navigate away without touching any form field
    await act(async () => {
      await router.navigate('/chats')
    })

    // The "Unsaved Changes" popup must NOT have appeared
    expect(screen.queryByRole('heading', { name: 'Unsaved Changes' })).not.toBeInTheDocument()
  })

  it('shows unsaved-changes popup when navigating away after editing the form', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(routes, {
      initialEntries: ['/data-sources/create'],
    })
    render(<RouterProvider router={router} />)

    await waitForFormReady()

    // Edit the description field so the form is genuinely dirty
    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.type(descInput, 'user-entered description')

    // Navigate away with a dirty form
    await act(async () => {
      await router.navigate('/chats')
    })

    // The "Unsaved Changes" popup MUST have appeared
    expect(screen.queryByRole('heading', { name: 'Unsaved Changes' })).toBeInTheDocument()
  })
})

const selectXWikiType = async (user: ReturnType<typeof userEvent.setup>) => {
  await selectAutocompleteOption('Datasource Type', 'xWiki', { user })
}

const userWithProject = {
  user_id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  is_admin: false,
  is_maintainer: false,
  user_type: 'INTERNAL',
  applications: ['test-project'],
  projects: [{ name: 'test-project', display_name: null, is_project_admin: true }],
}

const mockXWikiCredential = () => {
  mockAPI('GET', 'v1/settings/user/available', [
    {
      id: 'xwiki-setting-1',
      alias: 'my-xwiki',
      credential_type: 'XWIKI',
      project_name: 'test-project',
      is_global: true,
    },
  ])
}

describe('DataSourceCreatePage - xWiki', () => {
  beforeEach(() => {
    mockFormInitAPIs()
    mockXWikiCredential()
    mockAPI('GET', 'v1/user', userWithProject)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows Space, Wiki and the xWiki integration selector after selecting the xWiki type', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    await waitFor(
      () => {
        expect(screen.getByRole('textbox', { name: 'Space' })).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
    expect(screen.getByRole('textbox', { name: 'Wiki (optional)' })).toBeInTheDocument()
    expect(screen.getByText('Integration for xWiki')).toBeInTheDocument()
  })

  it('shows the space required error when saving without a space', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(descInput)
    await user.type(descInput, 'An xWiki datasource')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(
      () => {
        expect(screen.getByText('Space is required')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })
  it('posts space and wiki to the xwiki knowledge base endpoint', async () => {
    mockAPI('POST', 'v1/index/health', { implemented: false })
    mockAPI('POST', 'v1/index/knowledge_base/xwiki', { id: 'ds-xwiki-1' })

    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    await waitFor(() => {
      expect(screen.getByText('test-project')).toBeInTheDocument()
    })

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'my-xwiki-source')

    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(descInput)
    await user.type(descInput, 'An xWiki datasource')

    await user.type(screen.getByRole('textbox', { name: 'Space' }), 'KB')
    await user.type(screen.getByRole('textbox', { name: 'Wiki (optional)' }), 'xwiki')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/index/knowledge_base/xwiki'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"space":"KB"'),
          })
        )
      },
      { timeout: 5000 }
    )

    const xwikiPost = vi
      .mocked(global.fetch)
      .mock.calls.find(
        ([url, init]) =>
          requestUrl(url).includes('v1/index/knowledge_base/xwiki') &&
          (init as RequestInit)?.method === 'POST'
      )
    const body = JSON.parse((xwikiPost?.[1] as RequestInit).body as string)
    expect(body).toMatchObject({
      name: 'my-xwiki-source',
      description: 'An xWiki datasource',
      space: 'KB',
      wiki: 'xwiki',
      setting_id: 'xwiki-setting-1',
    })
  })
  // shouldShowScheduling is a denylist (blockedReindexingIndexTypes) plus an
  // INDEX_TYPES membership test, so adding XWIKI enabled the cron field
  // implicitly. This pins that down.
  it('shows the schedule field for xWiki and sends the selected cron expression', async () => {
    mockAPI('POST', 'v1/index/health', { implemented: false })
    mockAPI('POST', 'v1/index/knowledge_base/xwiki', { id: 'ds-xwiki-2' })

    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    await waitFor(() => {
      expect(screen.getByText('test-project')).toBeInTheDocument()
    })
    expect(screen.getByText('Expression')).toBeInTheDocument()

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'scheduled-xwiki')

    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(descInput)
    await user.type(descInput, 'A scheduled xWiki datasource')

    await user.type(screen.getByRole('textbox', { name: 'Space' }), 'KB')

    await selectDropdownOption('Expression', 'Daily at midnight', { user })

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/index/knowledge_base/xwiki'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"cron_expression":"0 0 * * *"'),
          })
        )
      },
      { timeout: 5000 }
    )
  })

  it('marks the xWiki option with a NEW badge in the type selector', async () => {
    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()

    const selector = await getAutocomplete('Datasource Type')
    await openAutocompleteDropdown(selector, user)

    const option = await screen.findByText('xWiki')
    expect(option.parentElement).toHaveTextContent('NEW')
  })

  it('omits the wiki key entirely when the Wiki field is left empty', async () => {
    mockAPI('POST', 'v1/index/health', { implemented: false })
    mockAPI('POST', 'v1/index/knowledge_base/xwiki', { id: 'ds-xwiki-3' })

    const user = userEvent.setup()
    renderPage('/data-sources/create')
    await waitForFormReady()
    await selectXWikiType(user)

    await waitFor(() => {
      expect(screen.getByText('test-project')).toBeInTheDocument()
    })

    const nameInput = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(nameInput)
    await user.type(nameInput, 'blank-wiki-source')

    const descInput = screen.getByRole('textbox', { name: 'Description' })
    await user.clear(descInput)
    await user.type(descInput, 'An xWiki datasource with no wiki set')

    await user.type(screen.getByRole('textbox', { name: 'Space' }), 'KB')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('v1/index/knowledge_base/xwiki'),
          expect.objectContaining({ method: 'POST' })
        )
      },
      { timeout: 5000 }
    )

    const createCall = vi
      .mocked(global.fetch)
      .mock.calls.find(
        ([url, init]) =>
          requestUrl(url).includes('v1/index/knowledge_base/xwiki') &&
          (init as RequestInit)?.method === 'POST'
      )
    const body = JSON.parse((createCall?.[1] as RequestInit).body as string)
    expect(body).not.toHaveProperty('wiki')
    expect(body.space).toBe('KB')

    // The health check must agree with the create request: a blank wiki is
    // omitted there too, never sent as an empty string.
    const healthCall = vi
      .mocked(global.fetch)
      .mock.calls.find(([url]) => requestUrl(url).includes('v1/index/health'))
    const healthBody = JSON.parse((healthCall?.[1] as RequestInit).body as string)
    expect(healthBody).not.toHaveProperty('wiki')
  })
})
