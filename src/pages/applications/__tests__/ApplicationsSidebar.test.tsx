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
import { MemoryRouter } from 'react-router'
import { expect, it, vi } from 'vitest'

import ApplicationsSidebar from '@/pages/applications/ApplicationsSidebar'

vi.mock('valtio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('valtio')>()),
  useSnapshot: (value: unknown) => value,
}))
const hosted = vi.hoisted(() => ({ capabilities: { view: true, create: true } }))
vi.mock('@/store/hostedApplications', () => ({ hostedApplicationsStore: hosted }))
vi.mock('@/components/Sidebar', () => ({
  default: ({ children }: any) => <aside>{children}</aside>,
}))
vi.mock('@/components/SidebarNavigation', () => ({
  default: ({ tabs }: any) => (
    <ul>
      {tabs.map((tab: any) => (
        <li key={tab.id}>
          <a href={tab.url}>{tab.name}</a>
        </li>
      ))}
    </ul>
  ),
}))

const renderSidebar = () =>
  render(
    <MemoryRouter>
      <ApplicationsSidebar activeCollection="mine" />
    </MemoryRouter>
  )

it('shows the five tabs in order', () => {
  renderSidebar()
  const names = screen.getAllByRole('link').map((link) => link.textContent)
  expect(names).toEqual(['My apps', 'Project', 'Marketplace', 'Shared with me', 'Platform apps'])
})

it('shows only Platform apps without hosted applications', () => {
  hosted.capabilities = { view: false, create: false }
  try {
    render(
      <MemoryRouter>
        <ApplicationsSidebar activeCollection="platform" />
      </MemoryRouter>
    )
    expect(screen.queryByRole('link', { name: 'My apps' })).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  } finally {
    hosted.capabilities = { view: true, create: true }
  }
})

it('has no folder tree, Trash or Explore', () => {
  renderSidebar()
  expect(screen.queryByText('My folders')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'New folder' })).not.toBeInTheDocument()
  expect(screen.queryByText('Trash')).not.toBeInTheDocument()
  expect(screen.queryByText('Explore')).not.toBeInTheDocument()
})
