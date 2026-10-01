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

import { afterEach, describe, expect, it } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

describe('appInfoStore — mobile shell', () => {
  afterEach(() => {
    appInfoStore.mobileNavigationOpen = false
    appInfoStore.mobileSidebarOpen = false
    appInfoStore.pageSidebarCount = 0
  })

  it('closes the page sidebar when the navigation menu opens', () => {
    appInfoStore.setMobileSidebarOpen(true)

    appInfoStore.setMobileNavigationOpen(true)

    expect(appInfoStore.mobileNavigationOpen).toBe(true)
    expect(appInfoStore.mobileSidebarOpen).toBe(false)
  })

  it('closes the navigation menu when the page sidebar opens', () => {
    appInfoStore.setMobileNavigationOpen(true)

    appInfoStore.setMobileSidebarOpen(true)

    expect(appInfoStore.mobileSidebarOpen).toBe(true)
    expect(appInfoStore.mobileNavigationOpen).toBe(false)
  })

  it('leaves the other overlay alone when one closes', () => {
    appInfoStore.setMobileSidebarOpen(true)

    appInfoStore.setMobileNavigationOpen(false)

    expect(appInfoStore.mobileSidebarOpen).toBe(true)
  })

  it('counts mounted page sidebars and closes the sidebar when the last one goes away', () => {
    const unregisterFirst = appInfoStore.registerPageSidebar()
    const unregisterSecond = appInfoStore.registerPageSidebar()
    appInfoStore.setMobileSidebarOpen(true)
    expect(appInfoStore.pageSidebarCount).toBe(2)

    unregisterFirst()
    expect(appInfoStore.pageSidebarCount).toBe(1)
    expect(appInfoStore.mobileSidebarOpen).toBe(true)

    unregisterSecond()
    expect(appInfoStore.pageSidebarCount).toBe(0)
    expect(appInfoStore.mobileSidebarOpen).toBe(false)
  })
})
