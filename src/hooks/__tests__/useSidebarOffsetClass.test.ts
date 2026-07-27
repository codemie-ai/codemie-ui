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
import { describe, it, expect, beforeEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import { useSidebarOffsetClass } from '../useSidebarOffsetClass'

describe('useSidebarOffsetClass', () => {
  beforeEach(() => {
    appInfoStore.sidebarExpanded = true
    appInfoStore.navigationExpanded = false
  })

  it('uses the runtime CSS var when sidebar is expanded, nav collapsed', () => {
    const { result } = renderHook(() => useSidebarOffsetClass())

    expect(result.current).toBe(
      'left-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('uses the runtime CSS var when sidebar and nav are expanded', () => {
    appInfoStore.navigationExpanded = true
    const { result } = renderHook(() => useSidebarOffsetClass())

    expect(result.current).toBe(
      'left-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('is unaffected by the CSS var when sidebar is collapsed', () => {
    appInfoStore.sidebarExpanded = false
    const { result } = renderHook(() => useSidebarOffsetClass())

    expect(result.current).toBe('left-navbar')
  })
})
