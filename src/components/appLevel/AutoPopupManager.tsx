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
import OnboardingFlowCard from '@/components/Onboarding/OnboardingFlowCard'
import Popup from '@/components/Popup'
import { HelpPageId, ROUTE_ID_TO_PAGE_ID } from '@/constants/helpLinks'
import { appInfoStore } from '@/store/appInfo'
import { onboardingStore } from '@/store/onboarding'
import { userStore } from '@/store/user'
import { profileSettingsStore } from '@/store/userProfileSettings'
import { OnboardingFlow } from '@/types/onboarding'

const NAVIGATION_INTRODUCTION_FLOW_ID = 'navigation-introduction'

/**
 * Manages all automatic popups with strict priority ordering:
 *   P1 (highest): Onboarding intro flow — new SSO users
 *   P2 (lowest):  First-time page popup — first visit to a page with guided tours
 *
 * P2 is suppressed while P1 is active.
 *
 * Note: The previous P2 release modal has been migrated to the non-blocking
 * ReleaseNotificationBar component.
 */
const AutoPopupManager: FC = () => {
  const { user } = useSnapshot(userStore)
  const { profileSettings, error: profileSettingsError } = useSnapshot(profileSettingsStore)
  const { isActive: isOnboardingActive } = useSnapshot(onboardingStore)
  const matches = useMatches()

  const [activePopup, setActivePopup] = useState<'page' | null>(null)
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
  // Handles P1 (onboarding intro) and loads release notes for top bar
  useEffect(() => {
    if (!user) return
    if (profileSettings === null && profileSettingsError === null) return

    if (!appInfoStore.isOnboardingCompleted() && userStore.isSSOUser()) {
      onboardingStore.startFlow(NAVIGATION_INTRODUCTION_FLOW_ID)
      return
    }

    appInfoStore.loadReleaseNotes()
  }, [user, profileSettings, profileSettingsError])

  // Effect 2: first-time page popup — runs on each route change
  // Handles P2; suppressed when onboarding session is active
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

  // Page popup (P2) handlers
  const closePagePopup = () => setActivePopup(null)

  const handleStartPageFlow = (flowId: string) => {
    closePagePopup()
    onboardingStore.startFlow(flowId)
  }

  return (
    <>
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
