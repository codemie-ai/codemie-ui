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

import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  autoPlacement,
  Placement,
} from '@floating-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { onboardingStore } from '@/store/onboarding'
import { HighlightStep } from '@/types/onboarding'

function getArrowBgPosition(
  containerHeight: number,
  basePlacement: 'top' | 'right' | 'bottom' | 'left',
  arrowY: number | undefined
): string {
  if (basePlacement === 'bottom') return '0 6px'
  if (basePlacement === 'top') return `0 ${-(containerHeight - 6)}px`
  return `0 ${-(arrowY ?? 0)}px`
}

interface OnboardingTooltipProps {
  step: HighlightStep
  currentStepNumber: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
}

export const OnboardingTooltip = ({
  step,
  currentStepNumber,
  totalSteps,
  isFirstStep,
  isLastStep,
}: OnboardingTooltipProps) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null)
  const [containerHeight, setContainerHeight] = useState(0)
  const arrowRef = useRef<HTMLDivElement>(null)

  // Get target element
  useEffect(() => {
    if (!step.target) {
      setTargetElement(null)
      return
    }

    const getElement = () => {
      if (typeof step.target === 'string') {
        return document.querySelector(step.target) as HTMLElement
      }
      return step.target()
    }

    const element = getElement()
    setTargetElement(element)

    // Update if element changes (e.g., after scroll/resize)
    const interval = setInterval(() => {
      const newElement = getElement()
      if (newElement !== element) {
        setTargetElement(newElement)
      }
    }, 500)

    // eslint-disable-next-line consistent-return
    return () => clearInterval(interval)
  }, [step.target])

  const explicitPlacement: Placement | undefined =
    step.tooltipPlacement != null && step.tooltipPlacement !== 'auto'
      ? (step.tooltipPlacement as Placement)
      : undefined

  // Floating UI hook for positioning
  const { refs, floatingStyles, middlewareData, placement, isPositioned } = useFloating({
    elements: {
      reference: targetElement,
    },
    ...(explicitPlacement ? { placement: explicitPlacement } : {}),
    middleware: [
      offset(22), // Gap between tooltip and target
      explicitPlacement ? flip() : autoPlacement(), // Auto-pick best side when no placement specified
      shift({ padding: 8 }), // Shift to stay in viewport
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate, // Auto-update position on scroll/resize
  })

  const setFloatingRef = useCallback(
    (el: HTMLDivElement | null) => {
      refs.setFloating(el)
      setContainerEl(el)
    },
    [refs.setFloating]
  )

  useEffect(() => {
    if (!containerEl) return
    setContainerHeight(containerEl.offsetHeight)
    const ro = new ResizeObserver(() => setContainerHeight(containerEl.offsetHeight))
    ro.observe(containerEl)
    // eslint-disable-next-line consistent-return
    return () => ro.disconnect()
  }, [containerEl])

  const basePlacement = placement.split('-')[0] as 'top' | 'right' | 'bottom' | 'left'
  const arrowStaticSide = ({ top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const)[
    basePlacement
  ]
  const arrowX = middlewareData.arrow?.x
  const arrowY = middlewareData.arrow?.y

  const arrowClipPath = {
    bottom: 'polygon(0% 50%, 100% 50%, 50% 100%)',
    top: 'polygon(50% 0%, 0% 50%, 100% 50%)',
    right: 'polygon(50% 0%, 100% 50%, 50% 100%)',
    left: 'polygon(0% 50%, 50% 0%, 50% 100%)',
  }[arrowStaticSide]

  const arrowBgPosition = containerHeight
    ? getArrowBgPosition(containerHeight, basePlacement, arrowY)
    : undefined
  const arrowBgSize = containerHeight ? `100% ${containerHeight}px` : undefined

  // Don't render at all until element is found and Floating UI has computed position
  // This prevents the tooltip from flashing in the center/corner before positioning
  const tooltipReady = !step.target || (targetElement !== null && isPositioned)

  // Fallback to center if no target
  const tooltipStyle = targetElement
    ? floatingStyles
    : {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }

  return (
    <div
      ref={setFloatingRef}
      className="relative z-[102] w-full max-w-sm bg-gradient5 rounded-2xl p-6 text-xs"
      style={{ ...tooltipStyle, visibility: tooltipReady ? 'visible' : 'hidden' }}
      role="dialog"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      <div className="mb-2 text-xs text-text-inverse font-medium">
        Step {currentStepNumber} of {totalSteps}
      </div>

      <h3 id="onboarding-title" className="text-base font-bold text-text-inverse mb-4">
        {step.title}
      </h3>

      <p
        id="onboarding-description"
        className="text-text-inverse mb-6 whitespace-pre-line leading-relaxed "
      >
        {step.description}
      </p>

      {step.content && <div className="mb-6 text-text-inverse">{step.content}</div>}

      {targetElement && (
        <div
          ref={arrowRef}
          className="absolute w-3 h-3 bg-gradient5"
          style={{
            left: arrowX != null ? `${arrowX}px` : '',
            top: arrowY != null ? `${arrowY}px` : '',
            [arrowStaticSide]: '-6px',
            clipPath: arrowClipPath,
            ...(arrowBgSize && { backgroundSize: arrowBgSize }),
            ...(arrowBgPosition && { backgroundPosition: arrowBgPosition }),
          }}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onboardingStore.skipFlow()}
          className="text-sm font-semibold text-text-inverse hover:text-text-inverse/80 transition-colors focus-visible:outline-none"
        >
          Skip
        </button>

        <div className="flex gap-4">
          {!isFirstStep && (
            <button
              onClick={() => onboardingStore.prevStep()}
              className="text-sm font-semibold text-text-inverse hover:text-text-inverse/80 transition-colors focus-visible:outline-none"
            >
              Back
            </button>
          )}

          <button
            onClick={() => onboardingStore.nextStep()}
            className="text-sm font-semibold text-text-inverse hover:text-text-inverse/80 transition-colors focus-visible:outline-none"
          >
            {isLastStep ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
