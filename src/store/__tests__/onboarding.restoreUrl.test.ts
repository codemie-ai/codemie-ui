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

import type { OnboardingFlow } from '@/types/onboarding'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockRouterPush = vi.fn()
const mockGetCurrentLocation = vi.fn()

vi.mock('@/hooks/useVueRouter', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
    replace: vi.fn(),
    back: vi.fn(),
    resolve: vi.fn(),
  },
  getCurrentLocation: () => mockGetCurrentLocation(),
}))

const mockUserStore = {
  user: { userId: 'test-user-123' } as { userId: string } | null,
}

vi.mock('@/store/user', () => ({
  get userStore() {
    return mockUserStore
  },
}))

// The onboarding configs import other things (React nodes, etc.).
// Replace the entire configs module with two lightweight flows:
//   - restoreFlow  → restoreUrlOnComplete: true  (used in Cases A and B)
//   - plainFlow    → restoreUrlOnComplete: false  (used in Case C)
const RESTORE_FLOW_ID = 'test-restore-flow'
const PLAIN_FLOW_ID = 'test-plain-flow'

const restoreFlow: OnboardingFlow = {
  id: RESTORE_FLOW_ID,
  name: 'Restore URL Test Flow',
  restoreUrlOnComplete: true,
  steps: [
    {
      id: 'step-1',
      actionType: 'Modal',
      title: 'Welcome',
      description: 'Test step',
    },
  ],
}

const plainFlow: OnboardingFlow = {
  id: PLAIN_FLOW_ID,
  name: 'Plain Test Flow',
  // restoreUrlOnComplete intentionally omitted (falsy)
  steps: [
    {
      id: 'step-1',
      actionType: 'Modal',
      title: 'Welcome',
      description: 'Test step',
    },
  ],
}

vi.mock('@/configs/onboarding', () => ({
  navigationIntroductionFlow: restoreFlow,
  chatInterfaceBasicsFlow: plainFlow,
  assistantsOverviewFlow: { id: 'unused-1', name: 'Unused', steps: [] },
  firstIntegrationFlow: { id: 'unused-2', name: 'Unused', steps: [] },
  firstDataSourceFlow: { id: 'unused-3', name: 'Unused', steps: [] },
  dataSourceListFlow: { id: 'unused-4', name: 'Unused', steps: [] },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Manually sets the internal store state that startFlow() would normally set,
 * bypassing real navigation logic so tests stay synchronous.
 */
async function simulateFlowStart(
  store: Awaited<ReturnType<typeof importStore>>,
  flowId: string,
  entryUrl: string
) {
  const flow = flowId === RESTORE_FLOW_ID ? restoreFlow : plainFlow
  store.activeFlowId = flowId
  store.activeSteps = [...flow.steps]
  store.currentStepIndex = 0
  store.isActive = true
  store.entryUrl = entryUrl
}

async function importStore() {
  const { onboardingStore } = await import('@/store/onboarding')
  return onboardingStore
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('onboardingStore — URL restore on skipFlow / completeFlow', () => {
  let store: Awaited<ReturnType<typeof importStore>>

  beforeEach(async () => {
    vi.clearAllMocks()
    store = await importStore()
    // Reset store state to a clean slate
    store.activeFlowId = null
    store.activeSteps = []
    store.currentStepIndex = 0
    store.isActive = false
    store.entryUrl = null
    // Ensure userStore has a user so completedFlows can be saved
    mockUserStore.user = { userId: 'test-user-123' }
  })

  // ─── Case A: New user WITHOUT a callback URL (entryUrl = '/') ─────────────

  describe('Case A — entryUrl is the root path ("/")', () => {
    it('A1: skipFlow called immediately (current URL equals entryUrl) — router.push is NOT called', () => {
      // Arrange
      mockGetCurrentLocation.mockReturnValue({ pathname: '/', search: '' })
      simulateFlowStart(store, RESTORE_FLOW_ID, '/')

      // Act
      store.skipFlow()

      // Assert
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('A2: skipFlow called after navigation (current URL changed) — router.push is NOT called because entryUrl is root', () => {
      // Arrange — user navigated to /help while the flow was active
      mockGetCurrentLocation.mockReturnValue({ pathname: '/help', search: '' })
      simulateFlowStart(store, RESTORE_FLOW_ID, '/')

      // Act
      store.skipFlow()

      // Assert — root entryUrl never triggers a restore, regardless of current URL
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('A3: completeFlow (current URL changed to /settings/profile) — router.push is NOT called', () => {
      // Arrange
      mockGetCurrentLocation.mockReturnValue({ pathname: '/settings/profile', search: '' })
      simulateFlowStart(store, RESTORE_FLOW_ID, '/')

      // Act
      store.completeFlow()

      // Assert
      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })

  // ─── Case B: New user WITH a callback URL ─────────────────────────────────

  describe('Case B — entryUrl is a deep callback URL ("/assistants/some-id")', () => {
    const callbackUrl = '/assistants/some-id'

    it('B1: skipFlow immediately (current URL still equals entryUrl) — router.push is NOT called', () => {
      // Arrange — the tour hasn't navigated away yet
      mockGetCurrentLocation.mockReturnValue({ pathname: callbackUrl, search: '' })
      simulateFlowStart(store, RESTORE_FLOW_ID, callbackUrl)

      // Act
      store.skipFlow()

      // Assert — current URL already matches entryUrl, no restore needed
      expect(mockRouterPush).not.toHaveBeenCalled()
    })

    it('B2: skipFlow after navigation (current URL is /help) — router.push(entryUrl) IS called', () => {
      // Arrange — flow navigated user to /help
      mockGetCurrentLocation.mockReturnValue({ pathname: '/help', search: '' })
      simulateFlowStart(store, RESTORE_FLOW_ID, callbackUrl)

      // Act
      store.skipFlow()

      // Assert
      expect(mockRouterPush).toHaveBeenCalledTimes(1)
      expect(mockRouterPush).toHaveBeenCalledWith(callbackUrl)
    })

    it('B3: completeFlow (current URL is /settings/profile) — router.push(entryUrl) IS called', () => {
      // Arrange
      mockGetCurrentLocation.mockReturnValue({ pathname: '/settings/profile', search: '' })
      simulateFlowStart(store, RESTORE_FLOW_ID, callbackUrl)

      // Act
      store.completeFlow()

      // Assert
      expect(mockRouterPush).toHaveBeenCalledTimes(1)
      expect(mockRouterPush).toHaveBeenCalledWith(callbackUrl)
    })
  })

  // ─── Case C: Flow WITHOUT restoreUrlOnComplete ────────────────────────────

  describe('Case C — flow without restoreUrlOnComplete', () => {
    it('C1: completeFlow — router.push is NOT called even when URL has changed', () => {
      // Arrange — user is on a different page than where the flow started
      mockGetCurrentLocation.mockReturnValue({ pathname: '/settings/profile', search: '' })
      simulateFlowStart(store, PLAIN_FLOW_ID, '/assistants/some-id')

      // Act
      store.completeFlow()

      // Assert — the flow opts out of URL restore, so push must not be called
      expect(mockRouterPush).not.toHaveBeenCalled()
    })
  })
})
