// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { onboardingStore } from '@/store/onboarding'
import { userStore } from '@/store/user'

import { ReleaseNotificationBar } from '../ReleaseNotificationBar'

// Mock navigate and router dependencies
const mockNavigate = vi.fn()
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('valtio', () => ({
  proxy: <T extends object>(obj: T) => obj,
  useSnapshot: <T extends object>(store: T) => store,
  subscribe: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: {
    appReleases: [{ version: '2.46.0' }],
    viewedAppReleaseVersion: '',
    dismissedReleaseBarVersion: '',
    isAdminBannerActive: vi.fn(() => false),
    isOnboardingCompleted: vi.fn(() => true),
    dismissReleaseBar: vi.fn(),
    setViewedAppVersion: vi.fn(),
    loadReleaseNotes: vi.fn(),
  },
}))

vi.mock('@/store/onboarding', () => ({
  onboardingStore: {
    isActive: false,
  },
}))

vi.mock('@/store/user', () => ({
  userStore: {
    user: { id: 'user-1', name: 'John Doe' },
    isSSOUser: vi.fn(() => false),
  },
}))

const renderWithRouter = () =>
  render(
    <MemoryRouter>
      <ReleaseNotificationBar />
    </MemoryRouter>
  )

describe('ReleaseNotificationBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(appInfoStore.isAdminBannerActive).mockReturnValue(false)
    vi.mocked(appInfoStore.isOnboardingCompleted).mockReturnValue(true)
    vi.mocked(userStore.isSSOUser).mockReturnValue(false)
    onboardingStore.isActive = false
    userStore.user = { id: 'user-1', name: 'John Doe' }
    appInfoStore.appReleases = [{ version: '2.46.0' }]
    appInfoStore.viewedAppReleaseVersion = ''
    appInfoStore.dismissedReleaseBarVersion = ''
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders when a new release is unviewed and undismissed', () => {
    renderWithRouter()

    expect(screen.getByRole('region', { name: 'New release notification' })).toBeInTheDocument()
    expect(screen.getByText('v2.46.0')).toBeInTheDocument()
    expect(screen.getByText('New CodeMie updates are available.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Release Notes' })).toBeInTheDocument()
  })

  it('does not render if there is no user logged in', () => {
    userStore.user = null

    const { container } = renderWithRouter()
    expect(container.firstChild).toBeNull()
  })

  it('does not render if there are no app releases', () => {
    appInfoStore.appReleases = []

    const { container } = renderWithRouter()
    expect(container.firstChild).toBeNull()
  })

  it('does not render if the latest release has already been viewed', () => {
    appInfoStore.viewedAppReleaseVersion = '2.46.0'

    const { container } = renderWithRouter()
    expect(container.firstChild).toBeNull()
  })

  it('does not render if the release bar has been dismissed for this version', () => {
    appInfoStore.dismissedReleaseBarVersion = '2.46.0'

    const { container } = renderWithRouter()
    expect(container.firstChild).toBeNull()
  })

  it('suppresses rendering when Admin Banner is active (Priority 1)', () => {
    vi.mocked(appInfoStore.isAdminBannerActive).mockReturnValue(true)

    const { container } = renderWithRouter()
    expect(container.firstChild).toBeNull()
  })

  it('suppresses rendering during initial SSO P1 onboarding intro flow', () => {
    vi.mocked(appInfoStore.isOnboardingCompleted).mockReturnValue(false)
    vi.mocked(userStore.isSSOUser).mockReturnValue(true)

    const { container } = renderWithRouter()
    expect(container.firstChild).toBeNull()
  })

  it('suppresses rendering when onboarding tour is active', () => {
    onboardingStore.isActive = true

    const { container } = renderWithRouter()
    expect(container.firstChild).toBeNull()
  })

  it('calls dismissReleaseBar when the dismiss "X" button is clicked', () => {
    renderWithRouter()

    const dismissBtn = screen.getByRole('button', { name: 'Close release updates banner' })
    fireEvent.click(dismissBtn)

    expect(appInfoStore.dismissReleaseBar).toHaveBeenCalledWith('2.46.0')
  })

  it('marks release viewed and navigates to release-notes when "View Release Notes" link is clicked', () => {
    renderWithRouter()

    const viewBtn = screen.getByRole('link', { name: 'View Release Notes' })
    fireEvent.click(viewBtn)

    expect(appInfoStore.setViewedAppVersion).toHaveBeenCalledWith('2.46.0')
    expect(mockNavigate).toHaveBeenCalledWith('/release-notes')
  })
})
