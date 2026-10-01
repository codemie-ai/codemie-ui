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

import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, NavigateFunction, UIMatch, useMatches, useNavigate } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MOBILE_TOP_BAR_BOTTOM_CSS_VAR } from '@/constants/mobileLayout'
import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { useTheme } from '@/hooks/useTheme'
import { appInfoStore } from '@/store/appInfo'
import { chatsStore } from '@/store/chats'

import MobileTopBar from '../MobileTopBar'

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(() => ({ isDark: true, appearance: null })),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return { ...actual, useMatches: vi.fn(() => []) }
})

let navigateTo: NavigateFunction

const Navigator = () => {
  navigateTo = useNavigate()
  return null
}

const renderTopBar = (path: string, routeId?: string) => {
  vi.mocked(useMatches).mockReturnValue(routeId ? [{ id: routeId } as UIMatch] : [])
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <MobileTopBar />
      <Navigator />
    </MemoryRouter>
  )
  const navigate = (to: string) => act(async () => navigateTo(to))
  return { navigate, ...view }
}

const sectionSwitcher = () => screen.getByRole('button', { name: /^Navigation menu/ })

describe('MobileTopBar', () => {
  beforeEach(() => {
    vi.spyOn(chatsStore, 'startNewChat').mockResolvedValue(undefined as never)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.mocked(useTheme).mockReturnValue({
      isDark: true,
      appearance: null,
    } as unknown as ReturnType<typeof useTheme>)
    appInfoStore.mobileNavigationOpen = false
    appInfoStore.mobileSidebarOpen = false
    appInfoStore.pageSidebarCount = 0
  })

  it('names the section switcher after the section of the current page', () => {
    renderTopBar('/assistants/123/edit')

    expect(sectionSwitcher()).toHaveAccessibleName('Navigation menu, current section Assistants')
  })

  it('falls back to the page title, then to "Menu"', () => {
    renderTopBar('/release-notes', 'release-notes')
    expect(sectionSwitcher()).toHaveAccessibleName('Navigation menu, current section Release Notes')

    cleanup()
    renderTopBar('/some-unknown-page')
    expect(sectionSwitcher()).toHaveAccessibleName('Navigation menu, current section Menu')
  })

  it('opens the navigation menu from the section switcher', async () => {
    renderTopBar('/chats')

    await userEvent.click(sectionSwitcher())

    expect(appInfoStore.mobileNavigationOpen).toBe(true)
  })

  it('offers the sidebar button only on pages with a sidebar', async () => {
    const { unmount } = renderTopBar('/chats')
    expect(screen.queryByRole('button', { name: 'Open sidebar' })).not.toBeInTheDocument()
    unmount()

    appInfoStore.registerPageSidebar()
    renderTopBar('/chats')
    await userEvent.click(screen.getByRole('button', { name: 'Open sidebar' }))

    expect(appInfoStore.mobileSidebarOpen).toBe(true)
  })

  it('turns the sidebar button into a close button while the sidebar is open', async () => {
    appInfoStore.pageSidebarCount = 1
    appInfoStore.mobileSidebarOpen = true
    renderTopBar('/chats')

    const closeButton = screen.getByRole('button', { name: 'Close sidebar' })
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')

    appInfoStore.mobileSidebarOpen = true
    await userEvent.click(closeButton)
    expect(appInfoStore.mobileSidebarOpen).toBe(false)
  })

  it('closes both overlays on navigation, but keeps them on a query-only change', async () => {
    const { navigate } = renderTopBar('/data-sources')
    appInfoStore.setMobileSidebarOpen(true)

    await navigate('/data-sources?page=2')
    expect(appInfoStore.mobileSidebarOpen).toBe(true)

    await navigate('/assistants')
    expect(appInfoStore.mobileSidebarOpen).toBe(false)
    expect(appInfoStore.mobileNavigationOpen).toBe(false)
  })

  it('closes the navigation menu when the current page is picked again', async () => {
    const { navigate } = renderTopBar('/assistants')
    appInfoStore.setMobileNavigationOpen(true)

    await navigate('/assistants')

    expect(appInfoStore.mobileNavigationOpen).toBe(false)
  })

  it('starts a new chat from the logo', async () => {
    renderTopBar('/assistants')

    await userEvent.click(screen.getByRole('button', { name: 'New chat' }))

    expect(chatsStore.startNewChat).toHaveBeenCalledWith('', '', false)
    await waitFor(() => expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'new-chat' }))
  })

  it('publishes its bottom edge for the overlays and clears everything on unmount', () => {
    const { unmount } = renderTopBar('/chats')
    expect(document.documentElement.style.getPropertyValue(MOBILE_TOP_BAR_BOTTOM_CSS_VAR)).toBe(
      '0px'
    )
    appInfoStore.setMobileNavigationOpen(true)

    unmount()

    expect(document.documentElement.style.getPropertyValue(MOBILE_TOP_BAR_BOTTOM_CSS_VAR)).toBe('')
    expect(appInfoStore.mobileNavigationOpen).toBe(false)
  })

  it('shows a custom logo and the light theme border', () => {
    vi.mocked(useTheme).mockReturnValue({
      isDark: false,
      appearance: { logoMode: 'custom', squareLogo: 'https://example.com/logo.png' },
    } as unknown as ReturnType<typeof useTheme>)

    const { container } = renderTopBar('/chats')

    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/logo.png')
    expect(container.firstChild).toHaveClass('border-b')
  })

  it('shows the built-in logo for the light and dark themes', () => {
    vi.mocked(useTheme).mockReturnValue({
      isDark: false,
      appearance: null,
    } as unknown as ReturnType<typeof useTheme>)
    const { container, unmount } = renderTopBar('/chats')
    expect(container.querySelector('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
    unmount()

    vi.mocked(useTheme).mockReturnValue({
      isDark: true,
      appearance: null,
    } as unknown as ReturnType<typeof useTheme>)
    const dark = renderTopBar('/chats')
    expect(dark.container.firstChild).not.toHaveClass('border-b')
  })
})
