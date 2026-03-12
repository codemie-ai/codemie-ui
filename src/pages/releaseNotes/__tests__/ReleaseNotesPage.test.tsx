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

import ReleaseNotesPage from '../ReleaseNotesPage'

interface Issue {
  key: string
  title: string
  link: string
  type: string
}

interface Release {
  version?: string
  issues: Issue[]
}

vi.hoisted(() => vi.resetModules())

const { mockAppInfoStore, mockTheme } = vi.hoisted(() => {
  const appReleases: Release[] = [
    {
      version: '1.2.0',
      issues: [
        {
          key: 'BUG-123',
          title: 'Fixed login issue',
          link: 'https://example.com/BUG-123',
          type: 'BUG',
        },
        {
          key: 'STORY-456',
          title: 'Added new dashboard feature',
          link: 'https://example.com/STORY-456',
          type: 'STORY',
        },
      ],
    },
    {
      version: '1.1.0',
      issues: [
        {
          key: 'BUG-789',
          title: 'Fixed navigation error',
          link: 'https://example.com/BUG-789',
          type: 'BUG',
        },
      ],
    },
  ]

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
  subscribe: vi.fn(),
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

describe('ReleaseNotesPage', () => {
  const initialAppReleases = [...mockAppInfoStore.appReleases]

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
      screen.getByText(
        'Discover the latest improvements, new features, and important changes in your experience.'
      )
    ).toBeInTheDocument()
  })

  it('displays all release versions', () => {
    render(<ReleaseNotesPage />)
    expect(screen.getByText('1.2.0')).toBeInTheDocument()
    expect(screen.getByText('1.1.0')).toBeInTheDocument()
  })

  it('displays releases in order', () => {
    render(<ReleaseNotesPage />)
    const versions = screen.getAllByText(/^\d+\.\d+\.\d+$/)
    expect(versions[0]).toHaveTextContent('1.2.0')
    expect(versions[1]).toHaveTextContent('1.1.0')
  })

  describe('release issues', () => {
    it('displays all issues from all releases', () => {
      render(<ReleaseNotesPage />)
      expect(screen.getByText('BUG-123')).toBeInTheDocument()
      expect(screen.getByText('Fixed login issue')).toBeInTheDocument()
      expect(screen.getByText('STORY-456')).toBeInTheDocument()
      expect(screen.getByText('Added new dashboard feature')).toBeInTheDocument()
      expect(screen.getByText('BUG-789')).toBeInTheDocument()
      expect(screen.getByText('Fixed navigation error')).toBeInTheDocument()
    })

    it('groups issues by type (BUG and STORY)', () => {
      render(<ReleaseNotesPage />)
      const bugIcons = screen.getAllByTestId('bug-icon')
      const storyIcons = screen.getAllByTestId('lightning-icon')

      expect(bugIcons.length).toBe(2)
      expect(storyIcons.length).toBe(1)
    })

    it('renders BUG issues before STORY issues', () => {
      render(<ReleaseNotesPage />)
      const issueKeys = screen.getAllByText(/^(BUG|STORY)-\d+$/)

      const bug123Index = issueKeys.findIndex((el) => el.textContent === 'BUG-123')
      const story456Index = issueKeys.findIndex((el) => el.textContent === 'STORY-456')

      expect(bug123Index).toBeLessThan(story456Index)
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
      mockAppInfoStore.appReleases = [{ issues: [] }]
      render(<ReleaseNotesPage />)
      expect(mockAppInfoStore.setViewedAppVersion).not.toHaveBeenCalled()
    })

    it('updates viewed version when appReleases changes', () => {
      const { rerender } = render(<ReleaseNotesPage />)
      expect(mockAppInfoStore.setViewedAppVersion).toHaveBeenCalledWith('1.2.0')

      mockAppInfoStore.appReleases = [
        {
          version: '2.0.0',
          issues: [],
        },
      ]

      rerender(<ReleaseNotesPage />)
      expect(mockAppInfoStore.setViewedAppVersion).toHaveBeenCalledWith('2.0.0')
    })
  })

  it('applies background gradient when theme is light', () => {
    mockTheme.isDark = false
    const { container } = render(<ReleaseNotesPage />)
    const mainDiv = container.querySelector('.pt-10') as HTMLElement

    const backgroundImage = mainDiv?.style.backgroundImage
    expect(backgroundImage).toBeTruthy()
    expect(backgroundImage).toContain('url(')
  })

  it('does not apply background gradient when theme is dark', () => {
    mockTheme.isDark = true
    const { container } = render(<ReleaseNotesPage />)
    const mainDiv = container.querySelector('.pt-10')

    expect(mainDiv).toHaveStyle({
      backgroundImage: 'none',
    })
  })

  describe('empty states', () => {
    it('renders page header even when no releases', () => {
      mockAppInfoStore.appReleases = []
      render(<ReleaseNotesPage />)

      expect(screen.getByText("What's New")).toBeInTheDocument()
      expect(
        screen.getByText(
          'Discover the latest improvements, new features, and important changes in your experience.'
        )
      ).toBeInTheDocument()
    })

    it('does not render any versions when appReleases is empty', () => {
      mockAppInfoStore.appReleases = []
      render(<ReleaseNotesPage />)

      const versions = screen.queryAllByText(/^\d+\.\d+\.\d+$/)
      expect(versions).toHaveLength(0)
    })

    it('renders version without issues when issues array is empty', () => {
      mockAppInfoStore.appReleases = [
        {
          version: '1.0.0',
          issues: [],
        },
      ]
      render(<ReleaseNotesPage />)

      expect(screen.getByText('1.0.0')).toBeInTheDocument()
      expect(screen.queryByTestId('bug-icon')).not.toBeInTheDocument()
      expect(screen.queryByTestId('lightning-icon')).not.toBeInTheDocument()
    })

    it('filters out issue types that have no issues', () => {
      mockAppInfoStore.appReleases = [
        {
          version: '1.0.0',
          issues: [
            {
              key: 'BUG-100',
              title: 'Bug fix only',
              link: 'https://example.com/BUG-100',
              type: 'BUG',
            },
          ],
        },
      ]
      render(<ReleaseNotesPage />)

      expect(screen.getByTestId('bug-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('lightning-icon')).not.toBeInTheDocument()
    })
  })

  it('renders all releases with their respective issues', () => {
    render(<ReleaseNotesPage />)

    expect(screen.getByText('1.2.0')).toBeInTheDocument()
    expect(screen.getByText('BUG-123')).toBeInTheDocument()
    expect(screen.getByText('STORY-456')).toBeInTheDocument()

    expect(screen.getByText('1.1.0')).toBeInTheDocument()
    expect(screen.getByText('BUG-789')).toBeInTheDocument()
  })

  it('handles releases with mixed issue types', () => {
    mockAppInfoStore.appReleases = [
      {
        version: '3.0.0',
        issues: [
          {
            key: 'BUG-1',
            title: 'Bug 1',
            link: 'https://example.com/BUG-1',
            type: 'BUG',
          },
          {
            key: 'STORY-1',
            title: 'Story 1',
            link: 'https://example.com/STORY-1',
            type: 'STORY',
          },
          {
            key: 'BUG-2',
            title: 'Bug 2',
            link: 'https://example.com/BUG-2',
            type: 'BUG',
          },
        ],
      },
    ]
    render(<ReleaseNotesPage />)

    expect(screen.getByText('BUG-1')).toBeInTheDocument()
    expect(screen.getByText('BUG-2')).toBeInTheDocument()
    expect(screen.getByText('STORY-1')).toBeInTheDocument()
  })
})
