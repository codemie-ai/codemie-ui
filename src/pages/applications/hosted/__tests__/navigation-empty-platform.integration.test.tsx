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

import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import Navigation from '@/components/Navigation/Navigation'

vi.mock('valtio', () => ({ useSnapshot: (value: unknown) => value }))

const boundary = vi.hoisted(() => ({
  platform: { applications: [] as unknown[] },
  hosted: { capabilities: { view: true } },
  router: { push: vi.fn(), resolve: vi.fn(({ name, path }) => ({ fullPath: path ?? '/' + name })) },
}))
vi.mock('@/store/applications', () => ({ applicationsStore: boundary.platform }))
vi.mock('@/store/hostedApplications', () => ({ hostedApplicationsStore: boundary.hosted }))
vi.mock('@/store/appInfo', () => ({ appInfoStore: { mobileNavigationOpen: false } }))
vi.mock('@/store/chats', () => ({ chatsStore: { startNewChat: vi.fn() } }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => boundary.router }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false }) }))
vi.mock('@/hooks/useIsMobileLayout', () => ({ useIsMobileLayout: () => false }))
vi.mock('@/hooks/useEscapeKey', () => ({ useEscapeKey: vi.fn() }))
vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: (name: string) => [name === 'features:hostedApplications'],
  useFavoritesEnabled: () => [false],
  useFavoritesPageEnabled: () => [false],
  usePinnedAssistantsEnabled: () => [false],
  useSchedulersViewEnabled: () => [false],
}))
vi.mock('@/utils/enterpriseEdition', () => ({ isEnterpriseEdition: () => false }))
vi.mock('@/components/Navigation/useNavigationExpanded', () => ({
  useNavigationExpanded: () => true,
}))
vi.mock('@/components/Navigation/NavigationLogo', () => ({ default: () => null }))
vi.mock('@/components/Navigation/NavigationExpandButton', () => ({ default: () => null }))
vi.mock('@/components/Navigation/NavigationProfile', () => ({ default: () => null }))
vi.mock('@/components/Navigation/NavigationPinnedSection/NavigationPinnedSection', () => ({
  default: () => null,
}))
// Only presentational rendering is replaced; Navigation's real capability/catalog condition runs.
vi.mock('@/components/Navigation/NavigationSection/NavigationSection', () => ({
  default: ({ items }: any) => (
    <nav>
      {items.map((item: any) => (
        <a key={item.label} href={item.route}>
          {item.label}
        </a>
      ))}
    </nav>
  ),
}))

beforeEach(() => {
  boundary.platform.applications = []
  boundary.hosted.capabilities = { view: true }
})

it('keeps Applications reachable when hosted viewing is enabled and no Platform applications are configured', () => {
  render(<Navigation />)
  expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute('href', '/apps')
})

it('hides the empty Applications entry when hosted viewing is disabled', () => {
  boundary.hosted.capabilities = { view: false }
  render(<Navigation />)
  expect(screen.queryByRole('link', { name: 'Applications' })).not.toBeInTheDocument()
})

it('retains configured Platform navigation when hosted viewing is disabled', () => {
  boundary.hosted.capabilities = { view: false }
  boundary.platform.applications = [{ id: 'existing-platform-app' }]
  render(<Navigation />)
  expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute('href', '/apps')
})
