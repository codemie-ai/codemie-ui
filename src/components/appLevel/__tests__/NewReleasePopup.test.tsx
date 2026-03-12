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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import NewReleasePopup from '../NewReleasePopup'

vi.hoisted(() => vi.resetModules())

const mockRouter = {
  push: vi.fn(),
  resolve: vi.fn(() => ({ href: `/release-notes` })),
}

const { mockAppInfoStore } = vi.hoisted(() => {
  return {
    mockAppInfoStore: {
      appReleases: [
        { version: '1.2.0', date: '2024-01-15', notes: 'Latest release' },
        { version: '1.1.0', date: '2024-01-01', notes: 'Previous release' },
      ],
      loadReleaseNotes: vi.fn(),
      isAppReleaseNew: vi.fn(() => true),
      setViewedAppVersion: vi.fn(),
    },
  }
})

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => mockRouter),
}))

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

describe('NewReleasePopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.appReleases = [
      { version: '1.2.0', date: '2024-01-15', notes: 'Latest release' },
      { version: '1.1.0', date: '2024-01-01', notes: 'Previous release' },
    ]
    mockAppInfoStore.isAppReleaseNew.mockReturnValue(true)
  })

  describe('basic rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<NewReleasePopup />)
      expect(container).toBeInTheDocument()
    })

    it('loads release notes on mount', () => {
      render(<NewReleasePopup />)
      expect(mockAppInfoStore.loadReleaseNotes).toHaveBeenCalled()
    })

    it('checks if release is new on mount', () => {
      render(<NewReleasePopup />)
      expect(mockAppInfoStore.isAppReleaseNew).toHaveBeenCalled()
    })
  })

  describe('popup visibility', () => {
    it('shows popup when release is new', () => {
      mockAppInfoStore.isAppReleaseNew.mockReturnValue(true)
      render(<NewReleasePopup />)
      expect(screen.getByText('New CodeMie Release')).toBeInTheDocument()
    })

    it('does not show popup when release is not new', () => {
      mockAppInfoStore.isAppReleaseNew.mockReturnValue(false)
      render(<NewReleasePopup />)
      expect(screen.queryByText('New CodeMie Release')).not.toBeInTheDocument()
    })
  })

  describe('popup content', () => {
    it('displays all content elements', () => {
      render(<NewReleasePopup />)
      expect(screen.getByText('New CodeMie Release')).toBeInTheDocument()
      expect(screen.getByText(/1\.2\.0/)).toBeInTheDocument()
      expect(screen.getByText(/Great news! We've rolled out new/i)).toBeInTheDocument()
      const codemieElements = screen.getAllByText(/CodeMie/i)
      expect(codemieElements.length).toBeGreaterThan(0)
      const link = screen.getByRole('link', { name: /Release Notes/i })
      expect(link).toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('displays action buttons', () => {
      render(<NewReleasePopup />)
      expect(screen.getByText('Got It, Thanks!')).toBeInTheDocument()
      expect(screen.getByText('Tell Me More')).toBeInTheDocument()
    })
  })

  describe('button and link interactions', () => {
    it('has correct Release Notes link attributes', () => {
      render(<NewReleasePopup />)
      const link = screen.getByRole('link', { name: /Release Notes/i })
      expect(link).toHaveAttribute('href', '/release-notes')
      expect(link).toHaveAttribute('target', '_self')
    })
  })
})
