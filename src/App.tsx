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
import React, { useEffect } from 'react'
import { Outlet } from 'react-router'
import { useSnapshot } from 'valtio'

import Banner from '@/components/appLevel/Banner'
import Gradient from '@/components/appLevel/Gradient'
import NewReleasePopup from '@/components/appLevel/NewReleasePopup'
import OnboardingPopup from '@/components/appLevel/OnboardingPopup'
import SessionExpiredPopup from '@/components/appLevel/SessionExpiredPopup'
import ToastContainer from '@/components/appLevel/ToastContainer'
import { UnsavedChangesPopup } from '@/components/appLevel/UnsavedChangesPopup'
import FloatingKataWindow from '@/components/FloatingKataWindow'
import { HelpPanel } from '@/components/HelpLauncher'
import Navigation from '@/components/Navigation/Navigation'
import Spinner from '@/components/Spinner'
import { primeReactPtOptions } from '@/constants/theme'
import { useHistoryStack } from '@/hooks/appLevel/useHistoryStack'
import useInitialDataFetch from '@/hooks/appLevel/useInitialDataFetch'
import usePrismThemeToggle from '@/hooks/appLevel/usePrismThemeToggle'
import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { floatingKataStore } from '@/store/floatingKata'
import { userStore } from '@/store/user'

const App: React.FC = () => {
  const { user, isLoadingUser } = useSnapshot(userStore)

  useHistoryStack()
  usePrismThemeToggle()
  useInitialDataFetch()

  // Load floating kata state from localStorage after user is loaded
  useEffect(() => {
    if (user) {
      floatingKataStore.loadFromLocalStorage()
    }
  }, [user])

  return (
    <PrimeReactProvider value={primeReactPtOptions}>
      <UnsavedChangesProvider>
        <Banner />
        <ToastContainer />

        {isLoadingUser ? (
          <Spinner className="w-20 h-20" />
        ) : (
          <div className="min-h-0 grow flex bg-surface-base-sidebar">
            <Gradient />
            <Navigation />
            <div className="z-0 grow">{user && <Outlet />}</div>
          </div>
        )}

        <NewReleasePopup />
        <OnboardingPopup />
        <SessionExpiredPopup />
        <FloatingKataWindow />
        <UnsavedChangesPopup />
        <HelpPanel />
      </UnsavedChangesProvider>
    </PrimeReactProvider>
  )
}

export default App
