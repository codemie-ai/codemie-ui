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

import { useState, useMemo, useEffect } from 'react'

import ChevronLeftSvg from '@/assets/icons/chevron-left.svg?react'
import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'
import ViewSvg from '@/assets/icons/view.svg?react'
import Button from '@/components/Button'
import Markdown from '@/components/markdown/Markdown'
import { parseMarkdownIntoSteps, calculateStepProgress } from '@/utils/markdownParser'

interface StepByStepNavigatorProps {
  markdownContent: string
  onExitStepMode: () => void
  initialStepIndex?: number
  onStepChange?: (index: number) => void
  isInFloatingWindow?: boolean
  onCompleteKata?: () => void
}

const StepByStepNavigator = ({
  markdownContent,
  onExitStepMode,
  initialStepIndex = 0,
  onStepChange,
  isInFloatingWindow = false,
  onCompleteKata,
}: StepByStepNavigatorProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex)

  const steps = useMemo(() => parseMarkdownIntoSteps(markdownContent), [markdownContent])
  const currentStep = steps[currentStepIndex]
  const progress = calculateStepProgress(currentStepIndex, steps.length)

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input/textarea
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (currentStepIndex > 0) {
          setCurrentStepIndex((prev) => prev - 1)
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStepIndex, steps.length])

  const handleStepClick = (index: number) => {
    setCurrentStepIndex(index)
  }

  // Notify parent when step index changes
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStepIndex)
    }
  }, [currentStepIndex, onStepChange])

  // Update internal state when initialStepIndex changes
  useEffect(() => {
    setCurrentStepIndex(initialStepIndex)
  }, [initialStepIndex])

  const renderNextButton = () => {
    if (currentStepIndex !== steps.length - 1) {
      return (
        <Button variant="primary" onClick={handleNext} className="flex-1">
          Next Step
          <ChevronRightSvg />
        </Button>
      )
    }

    if (isInFloatingWindow && onCompleteKata) {
      return (
        <Button
          variant="secondary"
          onClick={onCompleteKata}
          className="flex-1 bg-success-secondary text-success-primary border-success-primary hover:bg-success-primary hover:text-white focus:border-success-primary focus:ring-success-primary"
        >
          Complete Kata
          <ChevronRightSvg />
        </Button>
      )
    }

    return (
      <Button
        variant="secondary"
        onClick={onExitStepMode}
        className="flex-1 bg-success-secondary text-success-primary border-success-primary hover:bg-success-primary hover:text-white focus:border-success-primary focus:ring-success-primary"
      >
        Complete Review
        <ChevronRightSvg />
      </Button>
    )
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-text-quaternary text-sm">No steps found in this kata</p>
        {!isInFloatingWindow && (
          <Button variant="secondary" onClick={onExitStepMode}>
            <ViewSvg />
            View Full Content
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="flex items-center mb-4 pb-4 border-b border-border-specific-panel-outline">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-quaternary">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="text-xs font-semibold text-text-quaternary">
                {progress}% Complete
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-base-chat rounded-full overflow-hidden">
              <div
                className="h-full bg-not-started-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step navigation mini-map */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-thin">
        {steps.map((step, index) => {
          let stepClasses =
            'bg-surface-base-chat text-text-quaternary border border-border-specific-panel-outline hover:bg-surface-base-secondary hover:text-text-primary'

          if (index === currentStepIndex) {
            stepClasses = 'bg-not-started-primary text-white scale-110'
          } else if (index < currentStepIndex) {
            stepClasses =
              'bg-success-secondary text-success-primary border border-success-primary hover:bg-success-primary hover:text-white'
          }

          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(index)}
              className={`
                flex items-center justify-center shrink-0
                w-8 h-8 rounded-lg text-xs font-semibold
                transition-all duration-200
                ${stepClasses}
              `}
              title={step.title}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      {/* Current step content */}
      <div
        className="mb-6 flex flex-col"
        style={{ height: isInFloatingWindow ? '280px' : '400px' }}
      >
        <div className="mb-4 shrink-0">
          <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-not-started-primary/20 text-text-quaternary text-sm font-semibold shrink-0">
              {currentStepIndex + 1}
            </span>
            {currentStep.title}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
          <div className="prose prose-invert max-w-none">
            <Markdown content={currentStep.content} />
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex flex-col gap-2 pt-4 border-t border-border-specific-panel-outline">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="flex-1"
          >
            <ChevronLeftSvg />
            Previous
          </Button>

          {renderNextButton()}
        </div>

        {/* Keyboard hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-text-quaternary">
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-0.5 bg-surface-base-chat border border-border-specific-panel-outline rounded text-xs">
              ←
            </kbd>
            <kbd className="px-2 py-0.5 bg-surface-base-chat border border-border-specific-panel-outline rounded text-xs">
              →
            </kbd>
            <span>to navigate</span>
          </span>
        </div>
      </div>

      {/* Step list for reference - Hidden in floating window */}
      {!isInFloatingWindow && (
        <div className="mt-6 pt-6 border-t border-border-specific-panel-outline">
          <details className="group">
            <summary className="flex items-center gap-2 text-sm font-semibold text-text-quaternary cursor-pointer hover:text-text-primary transition select-none">
              <ChevronRightSvg className="w-4 h-4 transition-transform group-open:rotate-90" />
              All Steps ({steps.length})
            </summary>
            <div className="mt-3 space-y-2 pl-6">
              {steps.map((step, index) => {
                let listItemClasses =
                  'text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary'

                if (index === currentStepIndex) {
                  listItemClasses =
                    'bg-not-started-primary/20 text-text-quaternary font-semibold border border-not-started-primary/30'
                } else if (index < currentStepIndex) {
                  listItemClasses =
                    'bg-success-secondary/50 text-success-primary hover:bg-success-secondary'
                }

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(index)}
                    className={`
                      w-full text-left px-3 py-2 rounded-lg text-sm
                      transition-all duration-200
                      ${listItemClasses}
                    `}
                  >
                    <span className="font-semibold mr-2">{index + 1}.</span>
                    {step.title}
                  </button>
                )
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

export default StepByStepNavigator
