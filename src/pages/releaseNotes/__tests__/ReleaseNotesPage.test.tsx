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

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { formatDateTime } from '@/utils/helpers'

import ReleaseNotesPage from '../ReleaseNotesPage'
import { Release } from '../types'

// The rendered date depends on the machine's locale and timezone (e.g. en-US
// "July 11, 2025" vs en-GB "11 July 2025"), so derive the expected string from
// the same formatter the page uses instead of hardcoding an en-US literal.
const RELEASE_DATE_TEXT = formatDateTime('2025-07-11', 'day')

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore, mockTheme } = vi.hoisted(() => {
  // vi.hoisted runs before imports — use plain string keys matching SectionCode type
  const appReleases = [
    {
      version: '1.2.0',
      date: '2025-07-11',
      sections: [
        {
          code: 'highlights',
          items: [
            {
              title: 'Major highlight',
              description: 'A highlighted change.',
              issues: [{ key: 'HIGH-1', type: 'STORY', link: 'https://example.com/HIGH-1' }],
            },
          ],
        },
        {
          code: 'features',
          items: [
            {
              title: 'New dashboard',
              description: 'Added a new dashboard feature.',
              issues: [{ key: 'STORY-456', type: 'STORY', link: 'https://example.com/STORY-456' }],
            },
            {
              title: 'Performance tweak',
              description: 'Improved loading speed.',
              issues: [{ key: 'TASK-1', type: 'TASK', link: 'https://example.com/TASK-1' }],
            },
          ],
        },
        {
          code: 'fixes',
          items: [
            {
              title: 'Login fix',
              description: 'Fixed the login issue.',
              issues: [{ key: 'BUG-123', type: 'BUG', link: 'https://example.com/BUG-123' }],
            },
          ],
        },
      ],
    },
    {
      version: '1.1.0',
      date: '2025-06-01',
      sections: [
        { code: 'highlights', items: [] },
        { code: 'features', items: [] },
        {
          code: 'fixes',
          items: [
            {
              title: 'Navigation fix',
              description: 'Fixed navigation error.',
              issues: [{ key: 'BUG-789', type: 'BUG', link: 'https://example.com/BUG-789' }],
            },
          ],
        },
      ],
    },
  ] as unknown as Release[]

  return {
    mockAppInfoStore: {
      appReleases,
      setViewedAppVersion: vi.fn(),
    },
    mockTheme: {
      theme: 'codemieDark',
      isDark: true,
      setTheme: vi.fn(),
    },
  }
})

vi.mock('valtio', () => ({
  proxy: (obj: any) => obj,
  useSnapshot: vi.fn((store) => {
    if (store === mockAppInfoStore) return mockAppInfoStore
    return store
  }),
  subscribe: vi.fn(() => vi.fn()),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(() => mockTheme),
}))

vi.mock('@/assets/icons/bug.svg?react', () => ({
  default: (props: any) => <svg data-testid="bug-icon" {...props} />,
}))

vi.mock('@/assets/icons/lightning.svg?react', () => ({
  default: (props: any) => <svg data-testid="lightning-icon" {...props} />,
}))

vi.mock('@/assets/icons/info.svg?react', () => ({
  default: (props: any) => <svg data-testid="info-icon" {...props} />,
}))

describe('ReleaseNotesPage', () => {
  const initialAppReleases = JSON.parse(JSON.stringify(mockAppInfoStore.appReleases))

  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.appReleases = JSON.parse(JSON.stringify(initialAppReleases))
    mockTheme.isDark = true
  })

  it('renders without crashing', () => {
    const { container } = render(<ReleaseNotesPage />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('displays the page title', () => {
    render(<ReleaseNotesPage />)
    expect(screen.getByText("What's New")).toBeInTheDocument()
  })

  it('displays the page description', () => {
    render(<ReleaseNotesPage />)
    expect(
      screen.getByText('Discover the latest improvements, new features, and important changes.')
    ).toBeInTheDocument()
  })

  it('displays release versions in the secondary sidebar', () => {
    render(<ReleaseNotesPage />)
    expect(screen.getAllByText('1.2.0')).toHaveLength(2)
    expect(screen.getByText('1.1.0')).toBeInTheDocument()
  })

  it('displays releases in order', () => {
    render(<ReleaseNotesPage />)
    const versions = screen.getAllByText(/^\d+\.\d+\.\d+$/)
    expect(versions[0]).toHaveTextContent('1.2.0')
    expect(versions[1]).toHaveTextContent('1.1.0')
  })

  describe('release date', () => {
    it('displays formatted date when release has a date', () => {
      render(<ReleaseNotesPage />)
      expect(screen.getAllByText(RELEASE_DATE_TEXT)).toHaveLength(2)
    })

    it('does not render date when release has no date', () => {
      mockAppInfoStore.appReleases = [
        {
          version: '1.1.0',
          date: '',
          sections: [],
        },
      ]
      render(<ReleaseNotesPage />)
      expect(screen.queryByText(RELEASE_DATE_TEXT)).not.toBeInTheDocument()
    })
  })

  describe('release sections', () => {
    it('renders three sections in canonical order', () => {
      render(<ReleaseNotesPage />)
      const headings = screen.getAllByRole('heading', { level: 2 })
      const firstReleaseHeadings = headings.slice(1, 4).map((h) => h.textContent)

      expect(firstReleaseHeadings).toEqual(['Highlights', 'New features and enhancements', 'Fixes'])
    })

    it('renders item titles and descriptions', () => {
      render(<ReleaseNotesPage />)
      expect(screen.getByText('Major highlight')).toBeInTheDocument()
      expect(screen.getByText('A highlighted change.')).toBeInTheDocument()
      expect(screen.getByText('New dashboard')).toBeInTheDocument()
      expect(screen.getByText('Added a new dashboard feature.')).toBeInTheDocument()
    })

    it('renders issue keys from the selected release', () => {
      render(<ReleaseNotesPage />)
      expect(screen.getByText('BUG-123')).toBeInTheDocument()
      expect(screen.getByText('STORY-456')).toBeInTheDocument()
      expect(screen.getByText('HIGH-1')).toBeInTheDocument()
      expect(screen.queryByText('BUG-789')).not.toBeInTheDocument()
    })
  })

  describe('viewed app version tracking', () => {
    it('sets viewed app version to the latest release on mount', () => {
      render(<ReleaseNotesPage />)
      expect(mockAppInfoStore.setViewedAppVersion).toHaveBeenCalledWith('1.2.0')
      expect(mockAppInfoStore.setViewedAppVersion).toHaveBeenCalledTimes(1)
    })

    it('does not set viewed version when appReleases is empty', () => {
      mockAppInfoStore.appReleases = []
      render(<ReleaseNotesPage />)
      expect(mockAppInfoStore.setViewedAppVersion).not.toHaveBeenCalled()
    })

    it('does not set viewed version when first release has no version', () => {
      mockAppInfoStore.appReleases = [{ version: '', date: '', sections: [] }]
      render(<ReleaseNotesPage />)
      expect(mockAppInfoStore.setViewedAppVersion).not.toHaveBeenCalled()
    })

    it('updates viewed version when appReleases changes', () => {
      const { rerender } = render(<ReleaseNotesPage />)
      expect(mockAppInfoStore.setViewedAppVersion).toHaveBeenCalledWith('1.2.0')

      mockAppInfoStore.appReleases = [
        {
          version: '2.0.0',
          date: '2025-08-01',
          sections: [],
        },
      ]

      rerender(<ReleaseNotesPage />)
      expect(mockAppInfoStore.setViewedAppVersion).toHaveBeenCalledWith('2.0.0')
    })
  })

  it('falls back to the latest release for an invalid version', () => {
    window.history.replaceState({}, '', '/release-notes?version=9.9.9')
    render(<ReleaseNotesPage />)

    expect(screen.getByText('Major highlight')).toBeInTheDocument()
    expect(screen.getAllByText('1.2.0')).toHaveLength(2)
  })

  it('selects a release from the sidebar and updates the URL', () => {
    render(<ReleaseNotesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Select release 1.1.0' }))

    expect(screen.getByText('Navigation fix')).toBeInTheDocument()
    expect(screen.queryByText('Major highlight')).not.toBeInTheDocument()
    expect(window.location.search).toBe('?version=1.1.0')
  })

  describe('empty states', () => {
    it('renders page header even when no releases', () => {
      mockAppInfoStore.appReleases = []
      render(<ReleaseNotesPage />)

      expect(screen.getByText("What's New")).toBeInTheDocument()
      expect(
        screen.getByText('Discover the latest improvements, new features, and important changes.')
      ).toBeInTheDocument()
    })

    it('does not render any versions when appReleases is empty', () => {
      mockAppInfoStore.appReleases = []
      render(<ReleaseNotesPage />)

      const versions = screen.queryAllByText(/^\d+\.\d+\.\d+$/)
      expect(versions).toHaveLength(0)
    })

    it('does not render empty section headings', () => {
      mockAppInfoStore.appReleases = [
        {
          version: '1.0.0',
          date: '2025-05-01',
          sections: [],
        },
      ]
      render(<ReleaseNotesPage />)

      expect(screen.getAllByText('1.0.0')).toHaveLength(2)
      expect(screen.queryByText('Highlights')).not.toBeInTheDocument()
      expect(screen.queryByText('New features and enhancements')).not.toBeInTheDocument()
      expect(screen.queryByText('Fixes')).not.toBeInTheDocument()
    })
  })
})
