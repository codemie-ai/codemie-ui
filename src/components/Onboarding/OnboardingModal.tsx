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

import logoDark from '@/assets/images/logo-dark.svg'
import logoLight from '@/assets/images/logo-light.svg'
import Button from '@/components/Button/Button'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType } from '@/constants'
import { onboardingStore } from '@/store/onboarding'
import { ModalStep } from '@/types/onboarding'

import OnboardingFlowCard from './OnboardingFlowCard'

interface OnboardingModalProps {
  step: ModalStep
  currentStepNumber: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
}

export const OnboardingModal = ({
  step,
  currentStepNumber,
  totalSteps,
  isFirstStep,
  isLastStep,
}: OnboardingModalProps) => {
  const hasSuggestedFlows = step.suggestedNextFlows && step.suggestedNextFlows.length > 0

  const handleStartSuggestedFlow = (flowId: string) => {
    onboardingStore.completeFlow()
    // Small delay to allow current flow to complete
    setTimeout(() => {
      onboardingStore.startFlow(flowId)
    }, 300)
  }

  const footerContent = (
    <div className="flex items-center justify-between gap-3 w-full">
      {!hasSuggestedFlows && (
        <Button
          type={ButtonType.TERTIARY}
          size={ButtonSize.MEDIUM}
          onClick={() => onboardingStore.skipFlow()}
        >
          Skip Tour
        </Button>
      )}

      <div className="flex gap-3">
        {!isFirstStep && !hasSuggestedFlows && (
          <Button
            type={ButtonType.SECONDARY}
            size={ButtonSize.MEDIUM}
            onClick={() => onboardingStore.prevStep()}
          >
            Back
          </Button>
        )}

        {!hasSuggestedFlows && (
          <Button
            type={ButtonType.SECONDARY}
            size={ButtonSize.MEDIUM}
            onClick={() => onboardingStore.nextStep()}
          >
            {isLastStep ? 'Complete' : 'Next'}
          </Button>
        )}

        {hasSuggestedFlows && (
          <Button
            type={ButtonType.PRIMARY}
            size={ButtonSize.MEDIUM}
            onClick={() => onboardingStore.completeFlow()}
          >
            Complete
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <Popup
      visible
      onHide={() => onboardingStore.skipFlow()}
      footerContent={footerContent}
      dismissableMask={false}
      hideHeader
      hideClose
      className={hasSuggestedFlows ? 'max-w-2xl w-full' : 'max-w-xl w-full'}
      isMagic
    >
      {step.customRender ? (
        step.customRender()
      ) : (
        <div className="flex flex-col gap-6 py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <img src={logoDark} className="h-12 w-12 codemieLight:hidden" alt="CodeMie" />
            <img src={logoLight} className="h-12 w-12 codemieDark:hidden" alt="CodeMie" />

            <div className="flex flex-col gap-1">
              {!isFirstStep && !isLastStep && (
                <span className="text-xs font-medium text-text-secondary">
                  Step {currentStepNumber} of {totalSteps}
                </span>
              )}
              <h2 className="text-lg font-bold text-text-primary">{step.title}</h2>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-text-primary whitespace-pre-line">
            {step.description}
          </p>

          {step.content && <div className="text-text-primary">{step.content}</div>}

          {hasSuggestedFlows && (
            <div className="flex flex-col gap-3 pt-2 border-t border-border-structural">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-text-primary">Continue Learning</h3>
                <p className="text-sm text-text-secondary">
                  Choose your next guided tour or explore on your own:
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {step.suggestedNextFlows!.map((flow) => (
                  <OnboardingFlowCard
                    key={flow.flowId}
                    flowId={flow.flowId}
                    name={flow.title}
                    description={flow.description}
                    duration={flow.duration}
                    emoji={flow.emoji}
                    transparent
                    onStart={handleStartSuggestedFlow}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Popup>
  )
}
