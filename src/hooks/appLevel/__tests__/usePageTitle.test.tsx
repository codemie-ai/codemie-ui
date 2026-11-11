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

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_TITLE, ROUTE_ID_TO_TITLE } from '@/constants/pageTitles'
import * as ROUTES from '@/constants/routes'
import { responseReadyStore } from '@/store/responseReady'

import { usePageTitle } from '../usePageTitle'

import type { UIMatch } from 'react-router'

const { mockUseMatches } = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseMatches: vi.fn<any>(() => [] as UIMatch[]),
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useMatches: mockUseMatches,
  }
})

describe('usePageTitle', () => {
  beforeEach(() => {
    document.title = APP_TITLE
    mockUseMatches.mockClear()
  })

  it('sets document.title with page suffix for a known route', () => {
    mockUseMatches.mockReturnValue([
      { id: 'root', pathname: '/', params: {}, data: null, handle: null },
      { id: 'help', pathname: '/help', params: {}, data: null, handle: null },
    ])
    renderHook(() => usePageTitle())
    expect(document.title).toBe('EPAM AI/Run CodeMie - Help')
  })

  it('sets document.title for the chats route', () => {
    mockUseMatches.mockReturnValue([
      { id: 'root', pathname: '/', params: {}, data: null, handle: null },
      { id: 'chats', pathname: '/chats', params: {}, data: null, handle: null },
    ])
    renderHook(() => usePageTitle())
    expect(document.title).toBe('EPAM AI/Run CodeMie - Chats')
  })

  it('sets document.title for the analytics route', () => {
    mockUseMatches.mockReturnValue([
      { id: 'root', pathname: '/', params: {}, data: null, handle: null },
      { id: 'analytics', pathname: '/analytics', params: {}, data: null, handle: null },
    ])
    renderHook(() => usePageTitle())
    expect(document.title).toBe('EPAM AI/Run CodeMie - Analytics')
  })

  it('falls back to APP_TITLE for an unknown route id', () => {
    mockUseMatches.mockReturnValue([
      { id: 'root', pathname: '/', params: {}, data: null, handle: null },
      { id: 'unknown-route-id-xyz', pathname: '/unknown', params: {}, data: null, handle: null },
    ])
    renderHook(() => usePageTitle())
    expect(document.title).toBe(APP_TITLE)
  })

  it('sets document.title for the release-notes route', () => {
    mockUseMatches.mockReturnValue([
      { id: 'root', pathname: '/', params: {}, data: null, handle: null },
      { id: 'release-notes', pathname: '/release-notes', params: {}, data: null, handle: null },
    ])
    renderHook(() => usePageTitle())
    expect(document.title).toBe('EPAM AI/Run CodeMie - Release Notes')
  })

  it('sets document.title for the terms-and-conditions route', () => {
    mockUseMatches.mockReturnValue([
      { id: 'root', pathname: '/', params: {}, data: null, handle: null },
      {
        id: 'terms-and-conditions',
        pathname: '/terms-and-conditions',
        params: {},
        data: null,
        handle: null,
      },
    ])
    renderHook(() => usePageTitle())
    expect(document.title).toBe('EPAM AI/Run CodeMie - Terms and Conditions')
  })

  it('picks the deepest match when multiple routes have known titles', () => {
    mockUseMatches.mockReturnValue([
      { id: 'assistants', pathname: '/assistants', params: {}, data: null, handle: null },
      {
        id: 'edit-assistant',
        pathname: '/assistants/123/edit',
        params: {},
        data: null,
        handle: null,
      },
    ])
    renderHook(() => usePageTitle())
    expect(document.title).toBe('EPAM AI/Run CodeMie - Edit Assistant')
  })
  it.each([
    ['hosted-applications', '/apps', 'Applications'],
    ['hosted-applications-project', '/apps/project', 'Applications'],
    ['hosted-applications-marketplace', '/apps/marketplace', 'Applications Marketplace'],
    ['hosted-application-share', '/apps/share/token', 'Open Shared Application'],
  ])('sets document.title for the %s route', (id, pathname, title) => {
    mockUseMatches.mockReturnValue([
      { id: 'root', pathname: '/', params: {}, data: null, handle: null },
      { id, pathname, params: {}, data: null, handle: null },
    ])
    renderHook(() => usePageTitle())
    expect(document.title).toBe(`EPAM AI/Run CodeMie - ${title}`)
  })

  it('titles exactly the Applications routes that exist', () => {
    const routeIds = Object.values(ROUTES)
      .map(String)
      .filter((value) => value.startsWith('hosted-'))
    const titled = Object.keys(ROUTE_ID_TO_TITLE).filter((id) => id.startsWith('hosted-'))
    const byName = (a: string, b: string) => a.localeCompare(b)
    expect(titled.toSorted(byName)).toEqual(routeIds.toSorted(byName))
  })

  describe('response-ready indicator', () => {
    const chatsMatches = [
      { id: 'root', pathname: '/', params: {}, data: null, handle: null },
      { id: 'chats', pathname: '/chats', params: {}, data: null, handle: null },
    ] as UIMatch[]

    beforeEach(() => {
      responseReadyStore.pending = false
    })

    it('prefixes the route title while a response is ready', () => {
      mockUseMatches.mockReturnValue(chatsMatches)
      const { rerender } = renderHook(() => usePageTitle())
      act(() => {
        responseReadyStore.pending = true
      })
      rerender()
      expect(document.title).toBe('Response ready - EPAM AI/Run CodeMie - Chats')
    })

    it('restores the plain route title after the indicator is cleared', () => {
      mockUseMatches.mockReturnValue(chatsMatches)
      renderHook(() => usePageTitle())
      act(() => {
        responseReadyStore.pending = true
      })
      act(() => responseReadyStore.clearResponseReady())
      expect(document.title).toBe('EPAM AI/Run CodeMie - Chats')
    })

    it('keeps the prefix when the route changes while pending', () => {
      mockUseMatches.mockReturnValue(chatsMatches)
      const { rerender } = renderHook(() => usePageTitle())
      act(() => {
        responseReadyStore.pending = true
      })
      mockUseMatches.mockReturnValue([
        { id: 'root', pathname: '/', params: {}, data: null, handle: null },
        { id: 'help', pathname: '/help', params: {}, data: null, handle: null },
      ] as UIMatch[])
      rerender()
      expect(document.title).toBe('Response ready - EPAM AI/Run CodeMie - Help')
    })
  })
})
