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

import { FC } from 'react'
import { useSnapshot } from 'valtio'

import OnboardingFlowCard from '@/components/Onboarding/OnboardingFlowCard'
import { onboardingStore } from '@/store/onboarding'

const OnboardingToursSection: FC = () => {
  // Subscribe so the section re-renders when flows complete
  useSnapshot(onboardingStore)

  const flows = onboardingStore.getAllFlows()

  if (flows.length === 0) return null

  return (
    <section
      className="flex flex-col gap-y-5 lg:col-span-2 pb-4"
      data-onboarding="help-onboarding-section"
    >
      <div className="flex flex-col gap-y-1">
        <h2 className="text-lg font-semibold">Interactive Tours</h2>
        <p className="text-xs text-text-quaternary min-h-4">
          Learn CodeMie features through guided, interactive tutorials. Click any card to start.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {flows.map((flow) => (
          <OnboardingFlowCard
            key={flow.id}
            flowId={flow.id}
            name={flow.name}
            description={flow.description}
            emoji={flow.emoji}
            duration={flow.duration}
            isCompleted={onboardingStore.isFlowCompleted(flow.id)}
            showChevron
          />
        ))}
      </div>
    </section>
  )
}

export default OnboardingToursSection
