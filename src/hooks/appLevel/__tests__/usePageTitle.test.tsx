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

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_TITLE } from '@/constants/pageTitles'

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
})
