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

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APPLICATION_COLLECTIONS } from '@/pages/applications/applicationCollections'
import ApplicationsPage from '@/pages/applications/ApplicationsPage'

vi.mock('valtio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('valtio')>()),
  useSnapshot: (value: unknown) => value,
}))
const hosted = vi.hoisted(() => ({
  capabilities: null as { view: boolean } | null,
  ensureCapabilities: vi.fn(),
}))
vi.mock('@/store/hostedApplications', () => ({ hostedApplicationsStore: hosted }))
vi.mock('@/pages/applications/hosted/HostedApplicationsPage', () => ({
  default: () => <p>hosted collection</p>,
}))
vi.mock('@/pages/applications/PlatformApplicationsPage', () => ({
  default: ({ standalone }: { standalone?: boolean }) => (
    <p>{standalone ? 'platform only' : 'platform collection'}</p>
  ),
}))

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ApplicationsPage />
    </MemoryRouter>
  )

describe('Applications area shell', () => {
  beforeEach(() => {
    hosted.capabilities = { view: true }
    hosted.ensureCapabilities.mockReset()
    vi.mocked(useNavigate()).mockClear()
  })

  it('shows the hosted provider for the hosted collections', () => {
    renderAt('/apps/marketplace')
    expect(screen.getByText('hosted collection')).toBeInTheDocument()
    expect(hosted.ensureCapabilities).toHaveBeenCalled()
  })

  it('shows Platform apps without the hosted provider', () => {
    renderAt('/apps/platform')
    expect(screen.getByText('platform collection')).toBeInTheDocument()
    expect(screen.queryByText('hosted collection')).not.toBeInTheDocument()
    expect(useNavigate()).not.toHaveBeenCalled()
  })

  it('picks the provider from the collection registry, not from the tab name', () => {
    APPLICATION_COLLECTIONS.marketplace.provider = 'platform'
    try {
      renderAt('/apps/marketplace')
      expect(screen.getByText('platform collection')).toBeInTheDocument()
    } finally {
      APPLICATION_COLLECTIONS.marketplace.provider = 'hosted'
    }
  })

  it('sends every /apps route to Platform apps when hosted applications are off', async () => {
    hosted.capabilities = { view: false }
    renderAt('/apps/shared')
    expect(screen.getByText('platform only')).toBeInTheDocument()
    // useNavigate is a shared spy in unit tests (setupTests).
    await waitFor(() =>
      expect(useNavigate()).toHaveBeenCalledWith('/apps/platform', { replace: true })
    )
  })
})

describe('Applications area boundaries', () => {
  const source = (path: string) => readFileSync(resolve(__dirname, '../../..', path), 'utf8')
  const hostedImport = /from '[^']*(applications\/hosted\/|\.\/hosted\/)/

  it.each([
    'components/Navigation/Navigation.tsx',
    'pages/applications/applicationsRoutes.ts',
    'pages/applications/applicationCollections.tsx',
    'pages/applications/ApplicationsSidebar.tsx',
    'pages/applications/PlatformApplicationsPage.tsx',
    'pages/applications/usePlatformApplications.ts',
  ])('%s does not import hosted application files', (path) => {
    expect(source(path)).not.toMatch(hostedImport)
  })
})
