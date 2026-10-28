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

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useMarketplaceEditGate } from '../useMarketplaceEditGate'

const {
  mockIsMarketplaceApprovalGateEnabled,
  mockToaster,
  mockCheckMarketplaceGates,
  mockUnpublishAssistantFromMarketplace,
} = vi.hoisted(() => ({
  mockIsMarketplaceApprovalGateEnabled: vi.fn(() => true),
  mockToaster: { info: vi.fn(), error: vi.fn() },
  mockCheckMarketplaceGates: vi.fn(),
  mockUnpublishAssistantFromMarketplace: vi.fn(),
}))

vi.mock('@/utils/featureFlags', () => ({
  isMarketplaceApprovalGateEnabled: mockIsMarketplaceApprovalGateEnabled,
}))

vi.mock('@/utils/toaster', () => ({ default: mockToaster }))

const ASSISTANT_ID = 'asst-1'
const FORM_VALUES = {
  name: 'Test',
  categories: [{ id: 'cat-1' }, { id: 'cat-2' }],
}
const GATE_ERROR = {
  details: { gate_findings: [{ rule: 'r1', severity: 'CRITICAL', message: 'fail' }] },
}

function buildHook(overrides: Partial<Parameters<typeof useMarketplaceEditGate>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue({})
  const onPublish = vi.fn().mockResolvedValue({})
  const onSuccess = vi.fn()

  const result = renderHook(() =>
    useMarketplaceEditGate({
      assistantId: ASSISTANT_ID,
      assistantStatus: 'APPROVED',
      getFormValues: () => FORM_VALUES,
      onGateCheck: mockCheckMarketplaceGates,
      onUnpublish: mockUnpublishAssistantFromMarketplace,
      onSave,
      onPublish,
      onSuccess,
      ...overrides,
    })
  )
  return { ...result, onSave, onPublish, onSuccess }
}

describe('useMarketplaceEditGate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMarketplaceApprovalGateEnabled.mockReturnValue(true)
  })

  describe('handleSaveClickForLive', () => {
    it('opens revalidation modal when status is APPROVED and feature flag is on', () => {
      const { result } = buildHook({ assistantStatus: 'APPROVED' })
      act(() => {
        result.current.handleSaveClickForLive()
      })
      expect(result.current.revalidationWarningVisible).toBe(true)
    })

    it('returns true (intercepted) for a live status', () => {
      const { result } = buildHook({ assistantStatus: 'APPROVED' })
      let intercepted: boolean
      act(() => {
        intercepted = result.current.handleSaveClickForLive()
      })
      expect(intercepted!).toBe(true)
    })

    it('returns false and does not open modal when FF is off', () => {
      mockIsMarketplaceApprovalGateEnabled.mockReturnValue(false)
      const { result } = buildHook({ assistantStatus: 'APPROVED' })
      act(() => {
        result.current.handleSaveClickForLive()
      })
      expect(result.current.revalidationWarningVisible).toBe(false)
    })

    it('returns false for DRAFT (not a live status)', () => {
      const { result } = buildHook({ assistantStatus: 'DRAFT' })
      let intercepted: boolean
      act(() => {
        intercepted = result.current.handleSaveClickForLive()
      })
      expect(intercepted!).toBe(false)
      expect(result.current.revalidationWarningVisible).toBe(false)
    })
  })

  describe('handleRevalidationConfirm — gate failure vs server error', () => {
    it('sets gateError for a real gate failure (error.details.gate_findings)', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      const { result } = buildHook()
      await act(async () => {
        result.current.handleSaveClickForLive()
        await result.current.handleRevalidationConfirm()
      })
      expect(result.current.gateError).toEqual(GATE_ERROR)
      expect(mockToaster.error).not.toHaveBeenCalled()
    })

    it('sets gateError for a failed_rules gate error', async () => {
      const failedRulesError = { details: { failed_rules: ['r1'] } }
      mockCheckMarketplaceGates.mockResolvedValue({ error: failedRulesError })
      const { result } = buildHook()
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      expect(result.current.gateError).toEqual(failedRulesError)
    })

    it('shows an error toast (not the modal) for a server error without gate_findings', async () => {
      const serverError = { message: 'Internal Server Error' }
      mockCheckMarketplaceGates.mockResolvedValue({ error: serverError })
      const { result } = buildHook()
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      expect(result.current.gateError).toBeNull()
      expect(mockToaster.error).toHaveBeenCalledWith(expect.stringContaining('Failed to validate'))
    })

    it('saves and calls onSuccess when gate passes', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: null })
      const { result, onSave, onSuccess } = buildHook()
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      expect(onSave).toHaveBeenCalledWith(ASSISTANT_ID, FORM_VALUES, false)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('shows error toast and does not call onSuccess when gate-pass save has missing integrations', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: null })
      const { result, onSuccess } = buildHook({
        onSave: vi.fn().mockResolvedValue({ validation: { has_missing_integrations: true } }),
      })
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      expect(onSuccess).not.toHaveBeenCalled()
      expect(mockToaster.error).toHaveBeenCalledWith(
        expect.stringContaining('integrations are missing')
      )
    })
  })

  describe('categories are read from form values (comment 11 fix)', () => {
    it('passes getCategoryIds(formValues.categories) to checkMarketplaceGates', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: null })
      const formValues = { name: 'X', categories: [{ id: 'cat-A' }, { id: 'cat-B' }] }
      const { result } = buildHook({ getFormValues: () => formValues })
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      expect(mockCheckMarketplaceGates).toHaveBeenCalledWith(ASSISTANT_ID, formValues, [
        'cat-A',
        'cat-B',
      ])
    })

    it('uses the same categories for the force-publish call', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      const formValues = { name: 'X', categories: [{ id: 'cat-A' }] }
      const onPublish = vi.fn().mockResolvedValue({})
      const { result } = buildHook({ getFormValues: () => formValues, onPublish })
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      await act(async () => {
        await result.current.handleGateForcePublish('override notice')
      })
      expect(onPublish).toHaveBeenCalledWith(ASSISTANT_ID, ['cat-A'], 'override notice')
    })
  })

  describe('handleGateForcePublish', () => {
    async function openGateModal(hook: ReturnType<typeof buildHook>['result']) {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      await act(async () => {
        await hook.current.handleRevalidationConfirm()
      })
    }

    it('saves, publishes with the override notice, and calls onSuccess', async () => {
      const { result, onSave, onPublish, onSuccess } = buildHook()
      await openGateModal(result)
      await act(async () => {
        await result.current.handleGateForcePublish('Reviewed — false positive')
      })
      expect(onSave).toHaveBeenCalledWith(ASSISTANT_ID, FORM_VALUES, false)
      expect(onPublish).toHaveBeenCalledWith(
        ASSISTANT_ID,
        expect.any(Array),
        'Reviewed — false positive'
      )
      expect(onSuccess).toHaveBeenCalled()
      expect(mockToaster.info).toHaveBeenCalled()
    })

    it('shows error toast and does not call onSuccess when the save has missing integrations', async () => {
      const { result, onSuccess } = buildHook({
        onSave: vi.fn().mockResolvedValue({ validation: { has_missing_integrations: true } }),
      })
      await openGateModal(result)
      await act(async () => {
        await result.current.handleGateForcePublish('override')
      })
      expect(onSuccess).not.toHaveBeenCalled()
      expect(mockToaster.error).toHaveBeenCalledWith(
        expect.stringContaining('integrations are missing')
      )
    })

    it('shows error toast when publish fails', async () => {
      const { result, onSuccess } = buildHook({
        onPublish: vi.fn().mockResolvedValue({ error: { message: 'publish failed' } }),
      })
      await openGateModal(result)
      await act(async () => {
        await result.current.handleGateForcePublish('override')
      })
      expect(onSuccess).not.toHaveBeenCalled()
      expect(mockToaster.error).toHaveBeenCalledWith(expect.stringContaining('Failed to publish'))
    })

    it('calls onSubmittedForReview when publish lands in PENDING_REVIEW', async () => {
      const onSubmittedForReview = vi.fn()
      const { result } = buildHook({
        onPublish: vi.fn().mockResolvedValue({ marketplace_status: 'PENDING_REVIEW' }),
        onSubmittedForReview,
      })
      await openGateModal(result)
      await act(async () => {
        await result.current.handleGateForcePublish('override')
      })
      expect(onSubmittedForReview).toHaveBeenCalled()
    })

    it('calls onRefreshForGateError and shows new gate error when publish returns gate_findings', async () => {
      const newGateError = {
        details: { gate_findings: [{ rule: 'r2', severity: 'HIGH', message: 'new fail' }] },
      }
      const onRefreshForGateError = vi.fn().mockResolvedValue(undefined)
      const { result } = buildHook({
        onPublish: vi.fn().mockResolvedValue({ error: newGateError }),
        onRefreshForGateError,
      })
      await openGateModal(result)
      await act(async () => {
        await result.current.handleGateForcePublish('override')
      })
      expect(onRefreshForGateError).toHaveBeenCalledWith(ASSISTANT_ID)
      expect(result.current.gateError).toEqual(newGateError)
    })
  })

  describe('derived labels', () => {
    it('uses "Save and remove" label for PENDING_REVIEW status', () => {
      const { result } = buildHook({ assistantStatus: 'PENDING_REVIEW' })
      expect(result.current.gateSendForReviewLabel).toBe('Save and remove')
    })

    it('uses "Save & Unpublish" label for APPROVED status', () => {
      const { result } = buildHook({ assistantStatus: 'APPROVED' })
      expect(result.current.gateSendForReviewLabel).toBe('Save & Unpublish')
    })

    it('includes "review queue" in the banner for PENDING_REVIEW', () => {
      const { result } = buildHook({ assistantStatus: 'PENDING_REVIEW' })
      expect(result.current.gateBannerText).toMatch(/review queue/)
    })

    it('includes "Marketplace" in the banner for APPROVED', () => {
      const { result } = buildHook({ assistantStatus: 'APPROVED' })
      expect(result.current.gateBannerText).toMatch(/Marketplace/)
    })

    it('tells a PENDING_REVIEW owner the edit keeps the assistant in the queue, not that it is unpublished', () => {
      const { result } = buildHook({ assistantStatus: 'PENDING_REVIEW' })
      expect(result.current.revalidationWarningMessage).toMatch(/review queue/)
      expect(result.current.revalidationWarningMessage).not.toMatch(/unpublish/i)
    })

    it('warns an APPROVED owner the edit unpublishes the assistant until review completes', () => {
      const { result } = buildHook({ assistantStatus: 'APPROVED' })
      expect(result.current.revalidationWarningMessage).toMatch(/unpublish your assistant/)
      expect(result.current.revalidationWarningMessage).toMatch(/unavailable in the Marketplace/)
    })

    it('returns null banner text for non-live status', () => {
      const { result } = buildHook({ assistantStatus: 'REJECTED' })
      expect(result.current.gateBannerText).toBeNull()
    })
  })

  describe('handleRevalidationCancel', () => {
    it('hides the modal', () => {
      const { result } = buildHook()
      act(() => {
        result.current.handleSaveClickForLive()
      })
      act(() => {
        result.current.handleRevalidationCancel()
      })
      expect(result.current.revalidationWarningVisible).toBe(false)
    })
  })

  describe('handleGateKeepEditing', () => {
    it('clears gateError', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      const { result } = buildHook()
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      expect(result.current.gateError).not.toBeNull()
      act(() => {
        result.current.handleGateKeepEditing()
      })
      expect(result.current.gateError).toBeNull()
    })
  })

  describe('handleGateSaveAndUnpublish', () => {
    it('saves, unpublishes, toasts and calls onSuccess', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      mockUnpublishAssistantFromMarketplace.mockResolvedValue(undefined)
      const { result, onSave, onSuccess } = buildHook()
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      await act(async () => {
        await result.current.handleGateSaveAndUnpublish()
      })
      expect(onSave).toHaveBeenCalled()
      expect(mockUnpublishAssistantFromMarketplace).toHaveBeenCalledWith(ASSISTANT_ID)
      expect(onSuccess).toHaveBeenCalled()
      expect(mockToaster.info).toHaveBeenCalledWith(expect.stringContaining('unpublished'))
    })

    it('toasts the PENDING_REVIEW variant for that status', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      mockUnpublishAssistantFromMarketplace.mockResolvedValue(undefined)
      const { result } = buildHook({ assistantStatus: 'PENDING_REVIEW' })
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      await act(async () => {
        await result.current.handleGateSaveAndUnpublish()
      })
      expect(mockToaster.info).toHaveBeenCalledWith(expect.stringContaining('review queue'))
    })

    it('shows error toast and does not call onSuccess when save fails with missing integrations', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      const { result, onSuccess } = buildHook({
        onSave: vi.fn().mockResolvedValue({ validation: { has_missing_integrations: true } }),
      })
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      await act(async () => {
        await result.current.handleGateSaveAndUnpublish()
      })
      expect(onSuccess).not.toHaveBeenCalled()
      expect(mockToaster.error).toHaveBeenCalledWith(
        expect.stringContaining('integrations are missing')
      )
    })
  })

  describe('live assistant with missing integrations', () => {
    const VALIDATION = {
      has_missing_integrations: true,
      missing_by_credential_type: [],
      sub_assistants_missing: [],
      message: 'Missing integrations',
    }
    const missingSave = () => vi.fn().mockResolvedValue({ validation: VALIDATION })

    it('hands the values to the integrations modal instead of toasting when the gate-pass save is not applied', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: null })
      const onMissingIntegrations = vi.fn()
      const { result, onSuccess } = buildHook({ onSave: missingSave(), onMissingIntegrations })
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      expect(onMissingIntegrations).toHaveBeenCalledWith(VALIDATION, FORM_VALUES)
      expect(onSuccess).not.toHaveBeenCalled()
      expect(mockToaster.error).not.toHaveBeenCalled()
      expect(result.current.isValidating).toBe(false)
    })

    it('runs the gate-pass save with the skipValidation choice made in the form', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: null })
      const { result, onSave, onSuccess } = buildHook()
      await act(async () => {
        result.current.handleSaveClickForLive(true)
        await result.current.handleRevalidationConfirm()
      })
      expect(onSave).toHaveBeenCalledWith(ASSISTANT_ID, FORM_VALUES, true)
      expect(onSuccess).toHaveBeenCalled()
    })

    it('does not skip validation unless the form asked to', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: null })
      const { result, onSave } = buildHook()
      await act(async () => {
        result.current.handleSaveClickForLive()
        await result.current.handleRevalidationConfirm()
      })
      expect(onSave).toHaveBeenCalledWith(ASSISTANT_ID, FORM_VALUES, false)
    })

    it('Save & Unpublish prompts for integrations and neither unpublishes nor unblocks navigation', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      const onMissingIntegrations = vi.fn()
      const unblockTransition = vi.fn()
      const { result, onSuccess } = buildHook({
        onSave: missingSave(),
        onMissingIntegrations,
        unblockTransition,
      })
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      await act(async () => {
        await result.current.handleGateSaveAndUnpublish()
      })
      expect(onMissingIntegrations).toHaveBeenCalledWith(VALIDATION, FORM_VALUES)
      expect(mockUnpublishAssistantFromMarketplace).not.toHaveBeenCalled()
      expect(unblockTransition).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
      expect(result.current.gateError).toBeNull()
    })

    it('Force-publish prompts for integrations and does not publish', async () => {
      mockCheckMarketplaceGates.mockResolvedValue({ error: GATE_ERROR })
      const onMissingIntegrations = vi.fn()
      const { result, onPublish } = buildHook({ onSave: missingSave(), onMissingIntegrations })
      await act(async () => {
        await result.current.handleRevalidationConfirm()
      })
      await act(async () => {
        await result.current.handleGateForcePublish('notice')
      })
      expect(onMissingIntegrations).toHaveBeenCalledWith(VALIDATION, FORM_VALUES)
      expect(onPublish).not.toHaveBeenCalled()
    })
  })
})
