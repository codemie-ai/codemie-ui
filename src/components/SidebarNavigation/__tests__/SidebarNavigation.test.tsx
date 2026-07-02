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
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    currentRoute: { value: { query: {} } },
  }),
  replace: vi.fn(),
}))

const mockClearUrlFilters = vi.fn()
vi.mock('@/utils/filters', () => ({
  clearUrlFilters: mockClearUrlFilters,
  FILTER_ENTITY: { ASSISTANTS: 'assistants' },
}))

const TAB_ITEM = { id: 'all', name: 'All Assistants' }
const URL_ITEM = { id: 'templates', name: 'Templates', url: '/assistants/templates' }

describe('SidebarNavigation', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup()
  })

  const renderNav = async (activeId = TAB_ITEM.id) => {
    const { default: SidebarNavigation } = await import('../SidebarNavigation')
    render(<SidebarNavigation tabs={[TAB_ITEM, URL_ITEM]} activeId={activeId} />)
  }

  describe('clearUrlFilters is called unconditionally on navigation', () => {
    it('calls clearUrlFilters when navigating via tab id (no url)', async () => {
      await renderNav()

      await user.click(screen.getByRole('button', { name: /all assistants/i }))

      expect(mockClearUrlFilters).toHaveBeenCalledTimes(1)
    })

    it('calls clearUrlFilters when navigating via item.url', async () => {
      await renderNav()

      await user.click(screen.getByRole('button', { name: /templates/i }))

      expect(mockClearUrlFilters).toHaveBeenCalledTimes(1)
    })

    it('calls router.push with the url path when item.url is set', async () => {
      await renderNav()

      await user.click(screen.getByRole('button', { name: /templates/i }))

      expect(mockPush).toHaveBeenCalledWith(URL_ITEM.url)
    })

    it('clears URL filters before pushing to prevent filter bleed between tabs', async () => {
      await renderNav()
      await user.click(screen.getByRole('button', { name: /templates/i }))

      // clearUrlFilters must fire before router.push
      const clearOrder = mockClearUrlFilters.mock.invocationCallOrder[0]
      const pushOrder = mockPush.mock.invocationCallOrder[0]
      expect(clearOrder).toBeLessThan(pushOrder)
    })
  })
})
