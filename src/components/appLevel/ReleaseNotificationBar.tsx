// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import CrossSvg from '@/assets/icons/cross.svg?react'
import { appInfoStore } from '@/store/appInfo'
import { onboardingStore } from '@/store/onboarding'
import { userStore } from '@/store/user'
import { ConfigItem } from '@/types/entity/configuration'

export const ReleaseNotificationBar: FC = () => {
  const navigate = useNavigate()
  const { user } = useSnapshot(userStore)
  const {
    appReleases,
    viewedAppReleaseVersion,
    dismissedReleaseBarVersion,
    isAdminBannerDismissed,
    configs,
  } = useSnapshot(appInfoStore)
  const { isActive: isOnboardingActive } = useSnapshot(onboardingStore)

  const latestVersion = appReleases[0]?.version

  if (!user || !latestVersion) return null

  if (
    !isAdminBannerDismissed &&
    appInfoStore.isAdminBannerActive(configs as ConfigItem[] | undefined)
  )
    return null

  if (!appInfoStore.isOnboardingCompleted() && userStore.isSSOUser()) return null
  if (isOnboardingActive) return null

  const isNewRelease = viewedAppReleaseVersion !== latestVersion
  const isDismissed = dismissedReleaseBarVersion === latestVersion
  if (!isNewRelease || isDismissed) return null

  const handleDismiss = () => {
    appInfoStore.dismissReleaseBar(latestVersion)
  }

  const handleViewReleaseNotes = () => {
    appInfoStore.setViewedAppVersion(latestVersion)
    navigate('/release-notes')
  }

  return (
    <section
      aria-label="New release notification"
      className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white min-h-12 h-12 px-4 flex items-center justify-between gap-3 shadow-md shrink-0 z-30 transition-all duration-300"
    >
      <div className="flex-1 flex items-center justify-center gap-2.5 mx-auto text-center text-sm">
        {/* Version Badge */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur border border-white/25">
          <svg
            className="w-3 h-3 text-indigo-200 fill-current"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.3-6.2-4.6-6.2 4.6 2.3-7.3-6.1-4.5h7.6z" />
          </svg>
          <span>v{latestVersion}</span>
        </span>

        {/* Banner Copy */}
        <span className="font-medium">New CodeMie updates are available.</span>

        {/* Action Link */}
        <Link
          to="/release-notes"
          onClick={handleViewReleaseNotes}
          className="font-semibold underline underline-offset-2 hover:text-indigo-100 transition inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
        >
          <span>View Release Notes</span>
          <svg
            className="w-3.5 h-3.5 stroke-current"
            fill="none"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Close release updates banner"
        title="Dismiss release notification"
        className="text-white/80 hover:text-white hover:bg-black/15 p-1.5 rounded transition shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <CrossSvg className="w-3.5 h-3.5" />
      </button>
    </section>
  )
}

export default ReleaseNotificationBar
