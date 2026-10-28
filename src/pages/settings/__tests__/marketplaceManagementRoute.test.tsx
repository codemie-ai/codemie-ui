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
import { RouteObject } from 'react-router'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { routes } from '@/router'
import { appInfoStore } from '@/store/appInfo'

// The real layout needs router context and the marketplace store; the gate is
// what is under test here, so the guarded child is stubbed.
vi.mock(
  '@/pages/settings/administration/marketplaceManagement/MarketplaceManagementLayout',
  () => ({
    default: () => <div data-testid="marketplace-management-layout" />,
  })
)

const MARKETPLACE_PATH = '/settings/administration/marketplace-management'

const flattenRoutes = (list: RouteObject[]): RouteObject[] =>
  list.flatMap((route) => [route, ...(route.children ? flattenRoutes(route.children) : [])])

const findRouteByPath = (list: RouteObject[], path: string): RouteObject | undefined =>
  flattenRoutes(list).find((route) => route.path === path)

const setFlag = (enabled: boolean): void => {
  appInfoStore.configs = [
    { id: FEATURE_FLAGS.MARKETPLACE_MANAGEMENT, settings: { enabled } },
  ] as typeof appInfoStore.configs
  appInfoStore.isConfigFetched = true
}

describe('marketplace management route gating', () => {
  beforeEach(() => {
    setFlag(false)
  })

  it('the route exists in the router', () => {
    expect(findRouteByPath(routes, MARKETPLACE_PATH)).toBeDefined()
  })

  it('the settings child route exists in the marketplace router', () => {
    const marketplaceRoute = findRouteByPath(routes, MARKETPLACE_PATH)
    const settingsRoute = marketplaceRoute?.children?.find((c) => c.path === 'settings')
    expect(settingsRoute).toBeDefined()
  })

  it('the settings route has the correct id', () => {
    const marketplaceRoute = findRouteByPath(routes, MARKETPLACE_PATH)
    const settingsRoute = marketplaceRoute?.children?.find((c) => c.path === 'settings')
    expect(settingsRoute?.id).toBe('marketplace-management-settings')
  })

  it('throws a 404 when the flag is off, so a direct URL cannot render the page', () => {
    setFlag(false)
    const route = findRouteByPath(routes, MARKETPLACE_PATH)!

    expect(() => render(<>{route.element}</>)).toThrow(
      expect.objectContaining({
        message: 'Not Found',
        status: 404,
        statusText: 'Not Found',
      })
    )
  })

  it('renders the marketplace layout when the flag is on', () => {
    setFlag(true)
    const route = findRouteByPath(routes, MARKETPLACE_PATH)!

    render(<>{route.element}</>)

    expect(screen.getByTestId('marketplace-management-layout')).toBeInTheDocument()
  })
})
