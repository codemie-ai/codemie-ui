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
import { FC, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { marketplaceManagementStore } from '@/store/marketplaceManagement'
import { userStore } from '@/store/user'
import { navigate } from '@/test-utils/_mock-state'

import MarketplaceManagementLayout from '../MarketplaceManagementLayout'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: unknown) => store }
})

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: (({ content }) => <div>{content}</div>) as FC<{ content?: ReactNode }>,
}))

const mockToasterError = vi.fn()
vi.mock('@/utils/toaster', () => ({
  default: { error: (...a: unknown[]) => mockToasterError(...a) },
}))

const apiGet = vi.fn()
vi.mock('@/utils/api', () => ({
  default: { get: (...args: unknown[]) => apiGet(...args), post: vi.fn() },
}))

const MM_BASE = '/settings/administration/marketplace-management'

const childMounted = vi.fn()
const Child: FC = () => {
  childMounted()
  return <div data-testid="mm-child" />
}

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={[MM_BASE]}>
      <Routes>
        <Route path={MM_BASE} element={<MarketplaceManagementLayout />}>
          <Route index element={<Child />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

describe('MarketplaceManagementLayout access control', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiGet.mockResolvedValue({ json: async () => ({}) })
    marketplaceManagementStore.overview = null
  })

  it('renders nothing and loads no data for a regular user, then redirects', async () => {
    userStore.user = { isAdmin: false, isMaintainer: false } as typeof userStore.user

    renderLayout()

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/settings/administration'))
    expect(screen.queryByTestId('mm-child')).not.toBeInTheDocument()
    expect(childMounted).not.toHaveBeenCalled()
    expect(apiGet).not.toHaveBeenCalled()
    expect(mockToasterError).toHaveBeenCalled()
  })

  it('renders nothing and loads no data while the user is still unknown', () => {
    userStore.user = null as unknown as typeof userStore.user

    renderLayout()

    expect(screen.queryByTestId('mm-child')).not.toBeInTheDocument()
    expect(apiGet).not.toHaveBeenCalled()
  })

  it.each([
    ['admin', { isAdmin: true, isMaintainer: false }],
    ['maintainer', { isAdmin: false, isMaintainer: true }],
  ])('renders the tab pages and loads the overview for a %s', async (_role, flags) => {
    userStore.user = flags as typeof userStore.user

    renderLayout()

    expect(await screen.findByTestId('mm-child')).toBeInTheDocument()
    await waitFor(() => expect(apiGet).toHaveBeenCalled())
    expect(navigate).not.toHaveBeenCalled()
  })
})
