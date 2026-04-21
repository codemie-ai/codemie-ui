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

import { FC, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { userStore } from '@/store'
import { appInfoStore } from '@/store/appInfo'
import { onboardingStore } from '@/store/onboarding'

const NAVIGATION_INTRODUCTION_FLOW_ID = 'navigation-introduction'

const FirstTimeUserPopup: FC = () => {
  const { isOnboardingCompleted } = useSnapshot(appInfoStore) as typeof appInfoStore

  useEffect(() => {
    if (!isOnboardingCompleted() && userStore.isSSOUser()) {
      onboardingStore.startFlow(NAVIGATION_INTRODUCTION_FLOW_ID)
    }
  }, [])

  return null
}

export default FirstTimeUserPopup
