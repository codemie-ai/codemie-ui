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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '@/hooks/useVueRouter'
import type { OnboardingFlow } from '@/types/onboarding'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useVueRouter', () => ({
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), resolve: vi.fn() },
  getCurrentLocation: () => ({ pathname: '/', search: '' }),
}))

vi.mock('@/store/user', () => ({
  get userStore() {
    return { user: { userId: 'test-user' } }
  },
}))

// Three-step flow used across transition-guard tests:
//   step0 (Highlight, no delay) → step1 (Highlight, delay: 200) → step2 (Highlight, no delay)
const GUARD_FLOW_ID = 'guard-test-flow'

const guardFlow: OnboardingFlow = {
  id: GUARD_FLOW_ID,
  name: 'Guard Test Flow',
  steps: [
    {
      id: 'step0',
      actionType: 'Highlight',
      title: 'Step 0',
      description: 'desc',
      target: '[data-test="s0"]',
    },
    {
      id: 'step1',
      actionType: 'Highlight',
      title: 'Step 1',
      description: 'desc',
      target: '[data-test="s1"]',
      delay: 200,
    },
    {
      id: 'step2',
      actionType: 'Highlight',
      title: 'Step 2',
      description: 'desc',
      target: '[data-test="s2"]',
    },
  ],
}

vi.mock('@/configs/onboarding', () => ({
  navigationIntroductionFlow: guardFlow,
  chatInterfaceBasicsFlow: { id: 'unused-1', name: 'Unused', steps: [] },
  assistantsOverviewFlow: { id: 'unused-2', name: 'Unused', steps: [] },
  firstIntegrationFlow: { id: 'unused-3', name: 'Unused', steps: [] },
  firstDataSourceFlow: { id: 'unused-4', name: 'Unused', steps: [] },
  dataSourceListFlow: { id: 'unused-5', name: 'Unused', steps: [] },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function importStore() {
  const { onboardingStore } = await import('@/store/onboarding')
  return onboardingStore
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('onboardingStore — isTransitioning guard', () => {
  let store: Awaited<ReturnType<typeof importStore>>

  beforeEach(async () => {
    vi.clearAllMocks()
    store = await importStore()
    store.activeFlowId = GUARD_FLOW_ID
    store.activeSteps = [...guardFlow.steps]
    store.currentStepIndex = 0
    store.isActive = true
    store.entryUrl = null
    // Reset transitioning flag to a clean state before each test
    if ('isTransitioning' in store) {
      ;(store as typeof store & { isTransitioning: boolean }).isTransitioning = false
    }
  })

  describe('isTransitioning property', () => {
    it('isTransitioning is false when no transition is in progress', () => {
      expect((store as typeof store & { isTransitioning: boolean }).isTransitioning).toBe(false)
    })

    it('isTransitioning is true while nextStep is awaiting a delay', async () => {
      vi.useFakeTimers()

      const p = store.nextStep()
      // Mid-delay: isTransitioning must be true
      expect((store as typeof store & { isTransitioning: boolean }).isTransitioning).toBe(true)

      await vi.advanceTimersByTimeAsync(300)
      await p

      vi.useRealTimers()
    })

    it('isTransitioning is false after nextStep delay resolves', async () => {
      vi.useFakeTimers()

      const p = store.nextStep()
      await vi.advanceTimersByTimeAsync(300)
      await p

      expect((store as typeof store & { isTransitioning: boolean }).isTransitioning).toBe(false)

      vi.useRealTimers()
    })

    it('isTransitioning is reset to false by stopFlow', async () => {
      vi.useFakeTimers()

      store.nextStep() // starts 200ms transition, isTransitioning = true
      store.stopFlow()

      expect((store as typeof store & { isTransitioning: boolean }).isTransitioning).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('concurrent nextStep() calls while delay is in progress', () => {
    it('second concurrent call does not advance past the delayed step', async () => {
      vi.useFakeTimers()
      // At step0; transition to step1 requires 200ms delay.
      // First call starts transition and awaits the delay.
      // Second call arrives during the delay — it must be a no-op.

      const p1 = store.nextStep() // starts 200ms delay
      const p2 = store.nextStep() // should be blocked

      await vi.advanceTimersByTimeAsync(300)
      await Promise.all([p1, p2])

      // step1 (index 1), NOT step2 (index 2)
      expect(store.currentStepIndex).toBe(1)

      vi.useRealTimers()
    })
  })

  describe('CR-001 — exception safety: try/finally resets isTransitioning', () => {
    it('resets isTransitioning to false when a technical step throws', async () => {
      store.activeSteps = [
        {
          id: 'step0',
          actionType: 'Highlight',
          title: 'S0',
          description: 'desc',
          target: '[data-test="s0"]',
        },
        {
          id: 'bad-step',
          actionType: 'CodeExecution',
          title: 'Bad',
          description: 'throws',
          execute: vi.fn().mockRejectedValue(new Error('step-error')),
        },
        {
          id: 'step2',
          actionType: 'Highlight',
          title: 'S2',
          description: 'desc',
          target: '[data-test="s2"]',
        },
      ] as typeof store.activeSteps
      store.currentStepIndex = 0
      store.isTransitioning = false

      await expect(store.nextStep()).rejects.toThrow('step-error')
      expect(store.isTransitioning).toBe(false)
    })
  })

  describe('CR-002 — prevStep guard: concurrent backward navigation is blocked', () => {
    it('second concurrent prevStep call does not navigate back twice', async () => {
      vi.useFakeTimers()

      // step0 (Highlight) → step1 (Navigation) → step2 (Highlight)
      // From step2, prevStep must pass through the Navigation step (router.back + 500ms).
      store.activeSteps = [
        {
          id: 'step0',
          actionType: 'Highlight',
          title: 'S0',
          description: 'desc',
          target: '[data-test="s0"]',
        },
        {
          id: 'nav-step',
          actionType: 'Navigation',
          title: 'Nav',
          description: 'nav',
          route: '/help',
        },
        {
          id: 'step2',
          actionType: 'Highlight',
          title: 'S2',
          description: 'desc',
          target: '[data-test="s2"]',
        },
      ] as typeof store.activeSteps
      store.currentStepIndex = 2

      const p1 = store.prevStep()
      const p2 = store.prevStep() // should be blocked

      await vi.advanceTimersByTimeAsync(600)
      await Promise.all([p1, p2])

      expect(vi.mocked(router.back)).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })
})
