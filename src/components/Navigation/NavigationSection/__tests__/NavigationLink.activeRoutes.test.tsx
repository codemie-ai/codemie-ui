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

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { IconType } from '../../constants'
import NavigationLink, { NavigationLinkItem } from '../NavigationLink'

// Route matching itself stays real; only the data-router match list is not available here.
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useMatches: () => [],
}))

afterEach(cleanup)

const ACTIVE_CLASS = 'bg-surface-specific-navigation-link'
const applications: NavigationLinkItem = {
  label: 'Applications',
  icon: IconType.APPLICATION,
  route: '/apps',
  activeRoutes: ['/applications'],
}

const linkAt = (path: string, item: NavigationLinkItem = applications) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <NavigationLink item={item} />
    </MemoryRouter>
  )
  return screen.getByRole('link', { name: item.label })
}

describe('NavigationLink active state', () => {
  it.each([
    '/apps',
    '/apps/shared',
    '/apps/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/view',
    '/applications/sales-dashboard',
    '/applications/iframe/sales-dashboard',
  ])('highlights Applications on %s', (path) => {
    const link = linkAt(path)
    expect(link).toHaveClass(ACTIVE_CLASS)
    expect(link).toHaveAttribute('href', '/apps')
  })

  it.each(['/', '/assistants', '/app', '/applicationsx', '/workflows/apps'])(
    'does not highlight Applications on %s',
    (path) => {
      expect(linkAt(path)).not.toHaveClass(ACTIVE_CLASS)
    }
  )

  it('matches only its own route when it has no other active routes', () => {
    const assistants = { label: 'Assistants', icon: IconType.ASSISTANT, route: '/assistants' }
    expect(linkAt('/applications/sales-dashboard', assistants)).not.toHaveClass(ACTIVE_CLASS)
  })
})
