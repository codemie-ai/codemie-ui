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

import { PrimeReactProvider } from 'primereact/api'
import React, { useEffect, useRef } from 'react'
import { Outlet } from 'react-router'
import { useSnapshot } from 'valtio'

import AutoPopupManager from '@/components/appLevel/AutoPopupManager'
import Banner from '@/components/appLevel/Banner'
import Gradient from '@/components/appLevel/Gradient'
import SessionExpiredPopup from '@/components/appLevel/SessionExpiredPopup'
import ToastContainer from '@/components/appLevel/ToastContainer'
import { UnsavedChangesPopup } from '@/components/appLevel/UnsavedChangesPopup'
import FloatingKataWindow from '@/components/FloatingKataWindow'
import { HelpPanel } from '@/components/HelpLauncher'
import MobileTopBar from '@/components/Navigation/MobileTopBar'
import Navigation from '@/components/Navigation/Navigation'
import { OnboardingProvider } from '@/components/Onboarding'
import ResponseReadyAnnouncer from '@/components/ResponseReadyAnnouncer'
import SkipLink from '@/components/SkipLink/SkipLink'
import Spinner from '@/components/Spinner'
import { primeReactPtOptions } from '@/constants/theme'
import { useHistoryStack } from '@/hooks/appLevel/useHistoryStack'
import useInitialDataFetch from '@/hooks/appLevel/useInitialDataFetch'
import { usePageTitle } from '@/hooks/appLevel/usePageTitle'
import usePrismThemeToggle from '@/hooks/appLevel/usePrismThemeToggle'
import { useResponseReadyTab } from '@/hooks/appLevel/useResponseReadyTab'
import { useKatasEnabled } from '@/hooks/useFeatureFlags'
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout'
import { useTheme } from '@/hooks/useTheme'
import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { chatViewSettingsStore, setChatViewSettingsUserId } from '@/store/chatViewSettings'
import { floatingKataStore } from '@/store/floatingKata'
import { userStore } from '@/store/user'

import { appInfoStore } from './store/appInfo'

const App: React.FC = () => {
  const { user } = useSnapshot(userStore)
  const { isConfigFetched, mobileNavigationOpen } = useSnapshot(appInfoStore)
  const [katasEnabled] = useKatasEnabled()
  const kataLoadedFor = useRef<string | undefined>(undefined)
  const { appearance } = useTheme()
  const isMobileLayout = useIsMobileLayout()

  useHistoryStack()
  usePrismThemeToggle()
  useInitialDataFetch()
  usePageTitle()
  useResponseReadyTab()

  const showGradient = appearance?.gradients ?? true

  // Load per-user localStorage state after user is loaded
  useEffect(() => {
    if (user) {
      setChatViewSettingsUserId(user.userId)
      chatViewSettingsStore.loadFromLocalStorage()
    }
  }, [user])

  // Katas are off by default: restore the floating window only once config says they are on.
  // A config refetch flips isConfigFetched off and on, so load once per user, not per flip.
  useEffect(() => {
    if (user && isConfigFetched && katasEnabled && kataLoadedFor.current !== user.userId) {
      kataLoadedFor.current = user.userId
      floatingKataStore.loadFromLocalStorage()
    }
  }, [user, isConfigFetched, katasEnabled])

  return (
    <PrimeReactProvider value={primeReactPtOptions}>
      <OnboardingProvider>
        <UnsavedChangesProvider>
          {user && isConfigFetched && <SkipLink />}
          <Banner />
          <ToastContainer />
          <ResponseReadyAnnouncer />

          {!user || !isConfigFetched ? (
            <Spinner className="w-20 h-20" />
          ) : (
            <div className="min-h-0 grow flex max-lg:flex-col bg-surface-base-sidebar">
              {showGradient && !isMobileLayout && <Gradient />}
              {isMobileLayout && <MobileTopBar />}
              <Navigation />
              {/* data-app-content: the area mobile overlays cover (see utils/mobileOverlay). */}
              <div
                data-app-content
                inert={isMobileLayout && mobileNavigationOpen}
                className="z-0 grow min-w-0 max-lg:min-h-0"
              >
                {user && <Outlet />}
              </div>
            </div>
          )}

          {user && (
            <>
              <AutoPopupManager />
              {katasEnabled && <FloatingKataWindow />}
              <UnsavedChangesPopup />
              {/* Its floating button would cover primary actions on small screens and its
                  product tours target the desktop layout; Help stays in the navigation menu. */}
              {!isMobileLayout && <HelpPanel />}
            </>
          )}
          <SessionExpiredPopup />
        </UnsavedChangesProvider>
      </OnboardingProvider>
    </PrimeReactProvider>
  )
}

export default App
