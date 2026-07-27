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

import { describe, it, expect, beforeEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { getSidebarMaxWidthClass, getSidebarOffsetClass } from '@/utils/helpers'

describe('sidebar offset helpers', () => {
  beforeEach(() => {
    appInfoStore.sidebarExpanded = true
    appInfoStore.navigationExpanded = false
  })

  it('getSidebarMaxWidthClass uses the runtime CSS var when sidebar is expanded, nav collapsed', () => {
    expect(getSidebarMaxWidthClass()).toBe(
      'max-w-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('getSidebarMaxWidthClass uses the runtime CSS var when sidebar and nav are expanded', () => {
    appInfoStore.navigationExpanded = true
    expect(getSidebarMaxWidthClass()).toBe(
      'max-w-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('getSidebarMaxWidthClass is unaffected by the CSS var when sidebar is collapsed', () => {
    appInfoStore.sidebarExpanded = false
    expect(getSidebarMaxWidthClass()).toBe('max-w-navbar')
  })

  it('getSidebarOffsetClass uses the runtime CSS var when sidebar is expanded, nav collapsed', () => {
    expect(getSidebarOffsetClass()).toBe(
      'left-[calc(theme(spacing.navbar)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('getSidebarOffsetClass uses the runtime CSS var when sidebar and nav are expanded', () => {
    appInfoStore.navigationExpanded = true
    expect(getSidebarOffsetClass()).toBe(
      'left-[calc(theme(spacing.navbar-expanded)+var(--chat-sidebar-width,308px))]'
    )
  })

  it('getSidebarOffsetClass is unaffected by the CSS var when sidebar is collapsed', () => {
    appInfoStore.sidebarExpanded = false
    expect(getSidebarOffsetClass()).toBe('left-navbar')
  })
})
