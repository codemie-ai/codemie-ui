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

import { createPortal } from 'react-dom'
import { useSnapshot } from 'valtio'

import { onboardingStore } from '@/store/onboarding'
import { isModalStep, isHighlightStep, isUserVisibleStep } from '@/types/onboarding'

import { OnboardingModal } from './OnboardingModal'
import { OnboardingSpotlight } from './OnboardingSpotlight'
import { OnboardingTooltip } from './OnboardingTooltip'

export const OnboardingOverlay = () => {
  // Track these in snapshot to trigger re-renders when they change
  const {
    isActive,
    currentStepIndex: _currentStepIndex,
    activeFlowId: _activeFlowId,
  } = useSnapshot(onboardingStore)

  if (!isActive) return null

  const currentStep = onboardingStore.getCurrentStep()
  const currentFlow = onboardingStore.getCurrentFlow()

  if (!currentStep || !currentFlow) return null

  // Only render UI for user-visible steps (Modal and Highlight)
  if (!isUserVisibleStep(currentStep)) {
    return null
  }

  // Get user-visible step numbers
  const currentStepNumber = onboardingStore.getUserVisibleStepNumber()
  const totalSteps = onboardingStore.getTotalUserVisibleSteps()

  // Check if this is first/last user-visible step
  const isFirstUserVisibleStep = currentStepNumber === 1
  const isLastUserVisibleStep = currentStepNumber === totalSteps

  // Render Modal for Modal steps
  if (isModalStep(currentStep)) {
    const modal = (
      <OnboardingModal
        step={currentStep}
        currentStepNumber={currentStepNumber}
        totalSteps={totalSteps}
        isFirstStep={isFirstUserVisibleStep}
        isLastStep={isLastUserVisibleStep}
      />
    )
    return createPortal(modal, document.body)
  }

  // Render Tooltip + Spotlight for Highlight steps
  if (isHighlightStep(currentStep)) {
    const overlay = (
      <div
        className="fixed inset-0 z-[1200]"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        <OnboardingSpotlight target={currentStep.target} padding={currentStep.highlightPadding} />

        <OnboardingTooltip
          step={currentStep}
          currentStepNumber={currentStepNumber}
          totalSteps={totalSteps}
          isFirstStep={isFirstUserVisibleStep}
          isLastStep={isLastUserVisibleStep}
        />
      </div>
    )

    return createPortal(overlay, document.body)
  }

  return null
}
