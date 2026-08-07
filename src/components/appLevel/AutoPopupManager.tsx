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

import { FC, useEffect, useMemo, useState } from 'react'
import { useMatches } from 'react-router'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Link from '@/components/Link'
import OnboardingFlowCard from '@/components/Onboarding/OnboardingFlowCard'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { HelpPageId, ROUTE_ID_TO_PAGE_ID } from '@/constants/helpLinks'
import { useVueRouter } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { onboardingStore } from '@/store/onboarding'
import { userStore } from '@/store/user'
import { OnboardingFlow } from '@/types/onboarding'

const NAVIGATION_INTRODUCTION_FLOW_ID = 'navigation-introduction'

/**
 * Manages all automatic popups with strict priority ordering:
 *   P1 (highest): Onboarding intro flow — new SSO users
 *   P2:           New release popup — returning users with unseen release
 *   P3 (lowest):  First-time page popup — first visit to a page with guided tours
 *
 * P3 is suppressed while P1 or P2 is active. After P2 is dismissed on a
 * first-visit page, P3 will trigger automatically.
 */
const AutoPopupManager: FC = () => {
  const router = useVueRouter()
  const { user } = useSnapshot(userStore)
  const { appReleases } = useSnapshot(appInfoStore)
  const { isActive: isOnboardingActive } = useSnapshot(onboardingStore)
  const matches = useMatches()

  const [activePopup, setActivePopup] = useState<'release' | 'page' | null>(null)
  const [pageFlows, setPageFlows] = useState<OnboardingFlow[]>([])

  const currentPageId = useMemo(() => {
    let pageId: HelpPageId | null = null
    for (const match of matches) {
      if (match.id && ROUTE_ID_TO_PAGE_ID[match.id]) {
        pageId = ROUTE_ID_TO_PAGE_ID[match.id]
      }
    }
    return pageId
  }, [matches])

  // Effect 1: app-level popups — runs once when user is loaded
  // Handles P1 (onboarding intro) and P2 (new release)
  useEffect(() => {
    if (!user) return

    if (!appInfoStore.isOnboardingCompleted() && userStore.isSSOUser()) {
      onboardingStore.startFlow(NAVIGATION_INTRODUCTION_FLOW_ID)
      return
    }

    appInfoStore.loadReleaseNotes()
    if (appInfoStore.isOnboardingCompleted() && appInfoStore.isAppReleaseNew()) {
      setActivePopup('release')
    }
  }, [user])

  // Effect 2: first-time page popup — runs on each route change
  // Handles P3; suppressed when a higher-priority popup or onboarding session is active
  useEffect(() => {
    if (!currentPageId || !user) return
    if (isOnboardingActive) {
      // Silently consume the first-visit token so the popup doesn't fire after the tour ends
      if (onboardingStore.isFirstPageVisit(currentPageId)) {
        onboardingStore.markPageVisited(currentPageId)
      }
      return
    }
    if (activePopup !== null) return
    if (!appInfoStore.isOnboardingCompleted() && userStore.isSSOUser()) return

    if (onboardingStore.isFirstPageVisit(currentPageId)) {
      onboardingStore.markPageVisited(currentPageId)
      const flows = onboardingStore.getFlowsForFirstTimePageVisit(currentPageId)
      if (flows.length > 0) {
        setPageFlows(flows)
        setActivePopup('page')
      }
    }
  }, [currentPageId, user, activePopup, isOnboardingActive])

  // Release popup (P2) handlers
  const latestVersion = appReleases[0]?.version
  const releaseFlows = latestVersion ? onboardingStore.getFlowsForRelease(latestVersion) : []

  const closeReleasePopup = () => setActivePopup(null)

  const updateViewedRelease = () => {
    appInfoStore.setViewedAppVersion(latestVersion)
    closeReleasePopup()
  }

  const onNavigateToReleaseNotes = () => {
    router.push({ name: 'release-notes' })
    closeReleasePopup()
  }

  const handleStartReleaseFlow = (flowId: string) => {
    updateViewedRelease()
    onboardingStore.startFlow(flowId)
  }

  // Page popup (P3) handlers
  const closePagePopup = () => setActivePopup(null)

  const handleStartPageFlow = (flowId: string) => {
    closePagePopup()
    onboardingStore.startFlow(flowId)
  }

  return (
    <>
      <Popup
        limitWidth
        hideFooter
        onHide={closeReleasePopup}
        visible={activePopup === 'release'}
        header="New CodeMie Release"
      >
        <div className="p-5 pt-3">
          <div className="text-center">
            <span>
              Great news! We&apos;ve rolled out new <b>CodeMie</b> version <b>{latestVersion}</b> to
              enhance your experience. Take a moment to explore what&apos;s new and discover how
              these changes can benefit you! Please review{' '}
            </span>
            <Link
              target="_self"
              url={
                router.resolve({
                  name: 'release-notes',
                }).href
              }
              onClick={onNavigateToReleaseNotes}
              className="text-text-primary hover:text-text-primary font-bold decoration-text-primary"
            >
              Release Notes
            </Link>
            !
          </div>

          {releaseFlows.length > 0 && (
            <div className="flex flex-col gap-3 mt-5 pt-4 border-t border-border-structural">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-text-primary">
                  What&apos;s New in This Release
                </h3>
                <p className="text-xs text-text-secondary">
                  Explore guided tours to discover the new features in this version.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {releaseFlows.map((flow) => (
                  <OnboardingFlowCard
                    key={flow.id}
                    flowId={flow.id}
                    name={flow.name}
                    description={flow.description}
                    duration={flow.duration}
                    emoji={flow.emoji}
                    size="small"
                    onStart={handleStartReleaseFlow}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-center">
            <Button
              className="mr-3 w-32"
              variant={ButtonType.SECONDARY}
              onClick={updateViewedRelease}
            >
              Got It, Thanks!
            </Button>
            <Button className="w-32" onClick={onNavigateToReleaseNotes}>
              Tell Me More
            </Button>
          </div>
        </div>
      </Popup>

      {pageFlows.length > 0 && (
        <Popup
          limitWidth
          hideFooter
          visible={activePopup === 'page'}
          onHide={closePagePopup}
          header="Guided Tour Available"
        >
          <div className="p-5 pt-3">
            <p className="text-sm text-text-secondary text-center">
              You&apos;re here for the first time! Start a guided tour to quickly learn what you can
              do on this page.
            </p>
            <p className="text-sm text-text-secondary text-center">
              The tour is always available in the Help center if you want to check it out later.
            </p>
            <div className="flex flex-col gap-2 mt-4">
              {pageFlows.map((flow) => (
                <OnboardingFlowCard
                  key={flow.id}
                  flowId={flow.id}
                  name={flow.name}
                  description={flow.description}
                  duration={flow.duration}
                  emoji={flow.emoji}
                  size="small"
                  onStart={handleStartPageFlow}
                />
              ))}
            </div>
            <div className="mt-5 flex justify-center">
              <Button className="w-32" onClick={closePagePopup}>
                Maybe Later
              </Button>
            </div>
          </div>
        </Popup>
      )}
    </>
  )
}

export default AutoPopupManager
