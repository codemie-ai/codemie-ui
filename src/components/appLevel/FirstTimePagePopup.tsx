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
import { onboardingStore } from '@/store/onboarding'
import { userStore } from '@/store/user'
import { OnboardingFlow } from '@/types/onboarding'

const FirstTimePagePopup: FC = () => {
  const matches = useMatches()
  const { user } = useSnapshot(userStore)
  const [isVisible, setIsVisible] = useState(false)
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

  useEffect(() => {
    if (!currentPageId || !user) return

    if (onboardingStore.isFirstPageVisit(currentPageId)) {
      onboardingStore.markPageVisited(currentPageId)
      const flows = onboardingStore.getFlowsForFirstTimePageVisit(currentPageId)
      if (flows.length > 0) {
        setPageFlows(flows)
        setIsVisible(true)
      }
    }
  }, [currentPageId, user])

  const closePopup = () => setIsVisible(false)

  const handleStartFlow = (flowId: string) => {
    closePopup()
    onboardingStore.startFlow(flowId)
  }

  if (!isVisible || pageFlows.length === 0) return null

  return (
    <Popup
      limitWidth
      hideFooter
      visible={isVisible}
      onHide={closePopup}
      header="Guided Tour Available"
    >
      <div className="p-5 pt-3">
        <p className="text-sm text-text-secondary text-center">
          You&apos;re here for the first time! Start a guided tour to quickly learn what you can do
          on this page.
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
              onStart={handleStartFlow}
            />
          ))}
        </div>
        <div className="mt-5 flex justify-center">
          <Button className="w-32" onClick={closePopup}>
            Maybe Later
          </Button>
        </div>
      </div>
    </Popup>
  )
}

export default FirstTimePagePopup
