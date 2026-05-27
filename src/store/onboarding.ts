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

import { proxy } from 'valtio'

import {
  navigationIntroductionFlow,
  chatInterfaceBasicsFlow,
  assistantsOverviewFlow,
  firstIntegrationFlow,
  firstDataSourceFlow,
  dataSourceListFlow,
} from '@/configs/onboarding'
import { HelpPageId } from '@/constants/helpLinks'
import { router, getCurrentLocation } from '@/hooks/useVueRouter'
import {
  OnboardingFlow,
  OnboardingStep,
  isUserVisibleStep,
  isHighlightStep,
  isCodeExecutionStep,
  isNavigationStep,
  isTechnicalStep,
} from '@/types/onboarding'
import storage from '@/utils/storage'

import { userStore } from './user'

const COMPLETED_FLOWS_KEY = 'onboarding-completed-flows'
const VISITED_PAGES_KEY = 'onboarding-visited-pages'

const flows: OnboardingFlow[] = [
  navigationIntroductionFlow,
  chatInterfaceBasicsFlow,
  assistantsOverviewFlow,
  firstIntegrationFlow,
  firstDataSourceFlow,
  dataSourceListFlow,
]

export interface OnboardingStoreType {
  activeFlowId: string | null
  activeSteps: OnboardingStep[]
  currentStepIndex: number
  isActive: boolean
  entryUrl: string | null

  startFlow: (flowId: string) => Promise<void>
  stopFlow: () => void
  nextStep: () => Promise<void>
  prevStep: () => Promise<void>
  skipFlow: () => void
  completeFlow: () => void

  isFlowCompleted: (flowId: string) => boolean
  resetFlow: (flowId: string) => void
  getFlowsForPage: (pageId: HelpPageId) => OnboardingFlow[]
  getFlowsForWelcome: () => OnboardingFlow[]
  getFlowsForRelease: (version: string) => OnboardingFlow[]
  getFlowsForFirstTimePageVisit: (pageId: HelpPageId) => OnboardingFlow[]
  getAllFlows: () => OnboardingFlow[]

  markPageVisited: (pageId: HelpPageId) => void
  isFirstPageVisit: (pageId: HelpPageId) => boolean

  getCurrentStep: () => OnboardingStep | null
  getCurrentFlow: () => OnboardingFlow | null
  getUserVisibleStepNumber: () => number
  getTotalUserVisibleSteps: () => number
  getTargetElement: (target?: string | (() => HTMLElement | null)) => HTMLElement | null
}

export const onboardingStore = proxy<OnboardingStoreType>({
  activeFlowId: null,
  activeSteps: [],
  currentStepIndex: 0,
  isActive: false,
  entryUrl: null,

  async startFlow(flowId: string) {
    const flow = flows.find((f) => f.id === flowId) ?? null
    if (!flow) {
      console.error(`Onboarding flow "${flowId}" not found`)
      return
    }

    const { pathname, search } = getCurrentLocation()
    this.entryUrl = pathname + search

    // Evaluate all conditions upfront — only allowed steps participate in the flow
    const conditionResults = await Promise.all(
      flow.steps.map((step) => (step.condition ? step.condition() : Promise.resolve(true)))
    )
    const allowedSteps = flow.steps.filter((_, i) => conditionResults[i])

    this.activeFlowId = flowId
    this.activeSteps = allowedSteps
    this.currentStepIndex = 0
    // Note: isActive stays false until the first user-visible step is reached,
    // so the overlay never renders while technical steps are executing

    await flow.onStart?.()

    // Execute any leading technical steps, then activate at the first user-visible step
    let cursor = 0
    while (cursor < allowedSteps.length) {
      const step = allowedSteps[cursor]

      if (isTechnicalStep(step)) {
        // eslint-disable-next-line no-await-in-loop
        await runTechnicalStep(step)
        cursor += 1
      } else {
        // First user-visible step — activate the overlay
        this.currentStepIndex = cursor
        this.isActive = true
        if (isHighlightStep(step)) {
          const element = this.getTargetElement(step.target)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
          }
        }
        return
      }
    }

    // All steps were technical — complete immediately
    this.isActive = true
    this.completeFlow()
  },

  stopFlow() {
    this.isActive = false
    this.activeFlowId = null
    this.activeSteps = []
    this.currentStepIndex = 0
    this.entryUrl = null
  },

  async nextStep() {
    if (this.currentStepIndex >= this.activeSteps.length - 1) {
      this.completeFlow()
      return
    }

    let cursor = this.currentStepIndex + 1

    // Advance through technical steps without updating currentStepIndex —
    // this keeps the overlay visible (showing the current user-visible step)
    // while navigation/code-execution steps run in the background
    while (cursor < this.activeSteps.length) {
      const step = this.activeSteps[cursor]

      if (isTechnicalStep(step)) {
        // eslint-disable-next-line no-await-in-loop
        await runTechnicalStep(step)
        cursor += 1
      } else {
        // Next user-visible step — apply delay then show it
        if (step.delay) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise<void>((resolve) => {
            setTimeout(resolve, step.delay)
          })
        }
        this.currentStepIndex = cursor
        if (isHighlightStep(step)) {
          const element = this.getTargetElement(step.target)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
          }
        }
        return
      }
    }

    // No more user-visible steps
    this.completeFlow()
  },

  async prevStep() {
    if (this.currentStepIndex <= 0) return

    // Find the nearest previous user-visible step
    let targetIndex = this.currentStepIndex - 1
    while (targetIndex > 0 && isTechnicalStep(this.activeSteps[targetIndex])) {
      targetIndex -= 1
    }

    // If the found index is still a technical step, there is no visible step to go back to
    if (isTechnicalStep(this.activeSteps[targetIndex])) return

    // Reverse technical steps between current and target (in reverse order)
    for (let i = this.currentStepIndex - 1; i > targetIndex; i -= 1) {
      const step = this.activeSteps[i]

      if (isNavigationStep(step)) {
        router.back()
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 500)
        })
      } else if (isCodeExecutionStep(step) && step.onBack) {
        // eslint-disable-next-line no-await-in-loop
        await step.onBack()
      }
    }

    // Land on the target user-visible step
    this.currentStepIndex = targetIndex
    const targetStep = this.activeSteps[targetIndex]

    // For Highlight steps, scroll element into view (mirrors forward executeStep behaviour)
    if (isHighlightStep(targetStep)) {
      const element = this.getTargetElement(targetStep.target)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      }
    }
  },

  skipFlow() {
    const flow = this.getCurrentFlow()
    const savedEntryUrl = this.entryUrl

    this.stopFlow()

    if (flow) {
      flow.onComplete?.()
    }

    maybeRestoreEntryUrl(flow, savedEntryUrl)
  },

  completeFlow() {
    const flowId = this.activeFlowId
    if (!flowId) return

    const flow = this.getCurrentFlow()
    const savedEntryUrl = this.entryUrl

    this.stopFlow()

    const userId = userStore.user?.userId
    if (userId) {
      const completedFlows = getCompletedFlows()
      if (!completedFlows.includes(flowId)) {
        completedFlows.push(flowId)
        saveCompletedFlows(completedFlows)
      }
    }

    flow?.onComplete?.()

    maybeRestoreEntryUrl(flow, savedEntryUrl)
  },

  isFlowCompleted(flowId: string): boolean {
    const completedFlows = getCompletedFlows()
    return completedFlows.includes(flowId)
  },

  resetFlow(flowId: string) {
    const userId = userStore.user?.userId
    if (!userId) return

    const completedFlows = getCompletedFlows()
    const updatedFlows = completedFlows.filter((id) => id !== flowId)
    saveCompletedFlows(updatedFlows)
  },

  markPageVisited(pageId: HelpPageId) {
    const userId = userStore.user?.userId
    if (!userId) return

    const visitedPages = getVisitedPages()
    if (!visitedPages.includes(pageId)) {
      visitedPages.push(pageId)
      saveVisitedPages(visitedPages)
    }
  },

  isFirstPageVisit(pageId: HelpPageId): boolean {
    const visitedPages = getVisitedPages()
    return !visitedPages.includes(pageId)
  },

  getFlowsForPage(pageId: HelpPageId): OnboardingFlow[] {
    return flows.filter((flow) => flow.triggers?.helpPanelPages?.some((p) => p.id === pageId))
  },

  getFlowsForWelcome(): OnboardingFlow[] {
    return flows.filter((flow) => flow.triggers?.showOnWelcome)
  },

  getFlowsForRelease(version: string): OnboardingFlow[] {
    return flows.filter((flow) => flow.triggers?.releaseVersions?.includes(version))
  },

  getFlowsForFirstTimePageVisit(pageId: HelpPageId): OnboardingFlow[] {
    return flows.filter((flow) =>
      flow.triggers?.helpPanelPages?.some((p) => p.id === pageId && p.firstTimePopup)
    )
  },

  getAllFlows(): OnboardingFlow[] {
    return [...flows]
  },

  getCurrentStep(): OnboardingStep | null {
    return this.activeSteps[this.currentStepIndex] ?? null
  },

  getCurrentFlow(): OnboardingFlow | null {
    if (!this.activeFlowId) return null
    return flows.find((f) => f.id === this.activeFlowId) ?? null
  },

  getUserVisibleStepNumber(): number {
    let count = 0
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i <= this.currentStepIndex && i < this.activeSteps.length; i++) {
      if (isUserVisibleStep(this.activeSteps[i])) {
        // eslint-disable-next-line no-plusplus
        count++
      }
    }
    return count
  },

  getTotalUserVisibleSteps(): number {
    return this.activeSteps.filter(isUserVisibleStep).length
  },

  getTargetElement(target?: string | (() => HTMLElement | null)): HTMLElement | null {
    if (!target) return null

    if (typeof target === 'string') {
      return document.querySelector(target)
    }

    return target()
  },
})

// Navigates back to the URL captured at flow start, but only when:
// - the flow opts in via restoreUrlOnComplete
// - the entry URL differs from the app root (i.e. the user arrived via a callback URL)
// - the current URL has changed since the flow started
function maybeRestoreEntryUrl(flow: OnboardingFlow | null, savedEntryUrl: string | null): void {
  const rootPath = import.meta.env.BASE_URL ?? '/'
  if (!flow?.restoreUrlOnComplete || !savedEntryUrl || savedEntryUrl === rootPath) return

  const { pathname, search } = getCurrentLocation()
  const currentUrl = pathname + search
  if (savedEntryUrl !== currentUrl) {
    router.push(savedEntryUrl)
  }
}

// Executes a single technical step (Navigation or CodeExecution), including its delay.
// Extracted to keep startFlow / nextStep below the cognitive-complexity limit.
async function runTechnicalStep(step: OnboardingStep): Promise<void> {
  if (step.delay) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => {
      setTimeout(resolve, step.delay)
    })
  }
  if (isNavigationStep(step)) {
    router.push(step.route)
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 500)
    })
  } else if (isCodeExecutionStep(step)) {
    // eslint-disable-next-line no-await-in-loop
    await step.execute()
  }
}

// Helper functions for storage
function getCompletedFlows(): string[] {
  const userId = userStore.user?.userId
  if (!userId) return []
  return storage.get<string>(userId, COMPLETED_FLOWS_KEY)
}

function saveCompletedFlows(flows: string[]) {
  const userId = userStore.user?.userId
  if (!userId) return
  storage.put(userId, COMPLETED_FLOWS_KEY, flows)
}

function getVisitedPages(): string[] {
  const userId = userStore.user?.userId
  if (!userId) return []
  return storage.get<string>(userId, VISITED_PAGES_KEY)
}

function saveVisitedPages(pages: string[]) {
  const userId = userStore.user?.userId
  if (!userId) return
  storage.put(userId, VISITED_PAGES_KEY, pages)
}
