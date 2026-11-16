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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import { adminModelsStore } from '@/store/adminModels'
import { appInfoStore } from '@/store/appInfo'
import { AdminModel } from '@/types/entity/adminModel'
import { ModelStatus } from '@/types/entity/configuration'
import toaster from '@/utils/toaster'

import {
  isModelStatusEditable,
  isSameDefaultSelection,
  isSameModelsSettingsDraft,
  isSelectableDefaultModel,
  ModelsSettingsDraft,
  modelsWithDraftStatuses,
  toModelsSettingsDraft,
  updateDraftStatuses,
} from '../utils/modelsSettingsDraft'

export const useModelsSettingsDraft = () => {
  const { models: catalog, defaultError } = useSnapshot(adminModelsStore)
  const [draft, setDraft] = useState<ModelsSettingsDraft | null>(null)
  const [initialDraft, setInitialDraft] = useState<ModelsSettingsDraft | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([adminModelsStore.indexModels(), adminModelsStore.fetchGlobalDefault()])
      .then(([models, currentDefault]) => {
        if (cancelled) return
        const next = toModelsSettingsDraft(models, currentDefault)
        setDraft(next)
        setInitialDraft(next)
      })
      .catch((error) => {
        console.error('Failed to load global model settings:', error)
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const models = useMemo(() => modelsWithDraftStatuses(catalog, draft), [catalog, draft])
  const savedHasSelectableDefault = useMemo(
    () => modelsWithDraftStatuses(catalog, initialDraft).some(isSelectableDefaultModel),
    [catalog, initialDraft]
  )
  const changedModelNames = useMemo(
    () =>
      new Set(
        draft && initialDraft
          ? Object.keys(draft.statuses).filter(
              (baseName) => draft.statuses[baseName] !== initialDraft.statuses[baseName]
            )
          : []
      ),
    [draft, initialDraft]
  )
  const defaultHasChanges =
    !!draft && !!initialDraft && !isSameDefaultSelection(draft, initialDraft)
  const hasChanges = !!draft && !!initialDraft && !isSameModelsSettingsDraft(draft, initialDraft)
  const defaultIsValid =
    // Keep an already-unavailable chat catalog manageable without allowing the
    // draft to remove the last selectable default from an available catalog.
    (!savedHasSelectableDefault &&
      !models.some(isSelectableDefaultModel) &&
      !draft?.defaultModel) ||
    (draft?.usePlatformDefault
      ? models.some(isSelectableDefaultModel)
      : models.some(
          (model) => model.base_name === draft?.defaultModel && isSelectableDefaultModel(model)
        ))

  useUnsavedChanges({
    formId: 'global-model-settings',
    getCurrentValues: () => draft,
    comparator: () => hasChanges || saving,
  })

  const changeStatuses = useCallback(
    (targets: AdminModel[], status: ModelStatus) => {
      if (!draft || savingRef.current) return
      const editableTargets = targets.filter(isModelStatusEditable)
      if (editableTargets.length === 0) return
      const next = updateDraftStatuses(
        draft,
        catalog,
        editableTargets.map((model) => model.base_name),
        status
      )
      setDraft(next)
      if (!next.usePlatformDefault && draft.defaultModel !== next.defaultModel) {
        const model = catalog.find((item) => item.base_name === next.defaultModel)
        toaster.info(
          next.defaultModel
            ? `Default model selection changed<br>${
                model?.label ?? next.defaultModel
              } is selected. Click Apply changes to save.`
            : 'No default model available<br>Enable a model before applying changes.'
        )
      }
    },
    [catalog, draft]
  )

  const changeDefault = useCallback((baseName: string) => {
    if (!savingRef.current) {
      setDraft((current) =>
        current ? { ...current, defaultModel: baseName, usePlatformDefault: false } : current
      )
    }
  }, [])

  const resetDefault = useCallback(() => {
    if (!savingRef.current) {
      setDraft((current) => (current ? { ...current, usePlatformDefault: true } : current))
    }
  }, [])

  const discardChanges = useCallback(() => {
    if (!savingRef.current) setDraft(initialDraft)
  }, [initialDraft])

  const saveChanges = async () => {
    if (!draft || !initialDraft || !hasChanges || !defaultIsValid || savingRef.current) return false
    savingRef.current = true
    setSaving(true)
    let saveError: unknown = null

    const applyStatus = async (status: ModelStatus) => {
      const targets = catalog.filter(
        (model) =>
          isModelStatusEditable(model) &&
          draft.statuses[model.base_name] === status &&
          initialDraft.statuses[model.base_name] !== status
      )
      if (targets.length === 0) return
      const outcome = await adminModelsStore.bulkSetModelStatus(
        targets.map((model) => model.base_name),
        status
      )
      const succeeded = new Set(
        outcome.results.filter((result) => result.success).map((result) => result.base_name)
      )
      const failed = targets.filter((model) => !succeeded.has(model.base_name))
      if (failed.length > 0) {
        throw new Error(`Failed to update: ${failed.map((model) => model.label).join(', ')}.`)
      }
    }

    try {
      // A replacement may itself be disabled today. Enable it before saving the
      // new default, then retire the old one so the default remains available.
      await applyStatus('enabled')
      if (defaultHasChanges) {
        if (draft.usePlatformDefault) {
          await adminModelsStore.clearGlobalDefault()
        } else if (draft.defaultModel) {
          await adminModelsStore.setGlobalDefault(draft.defaultModel)
        }
      }
      await applyStatus('disabled')
      await applyStatus('deprecated')
    } catch (error) {
      saveError = error
    }

    try {
      // Some writes may have succeeded even when a later write or refresh fails.
      appInfoStore.invalidateProjectLLMModels()
      const [savedModels, savedDefault] = await Promise.all([
        adminModelsStore.indexModels(),
        adminModelsStore.fetchGlobalDefault(),
      ])
      const savedDraft = toModelsSettingsDraft(savedModels, savedDefault)
      setInitialDraft(savedDraft)
      // Successful writes become the baseline even after a partial failure;
      // preserve the intended draft so only the remaining changes are retried.
      if (!saveError) setDraft(savedDraft)
      await appInfoStore.getLLMModels()
    } catch (error) {
      saveError = saveError ?? error
    } finally {
      savingRef.current = false
      setSaving(false)
    }

    if (saveError) {
      toaster.error(
        adminModelsStore.defaultError ??
          (saveError instanceof Error ? saveError.message : 'Failed to apply model settings.')
      )
      return false
    }
    toaster.info('Model settings updated')
    return true
  }

  return {
    models,
    defaultError,
    defaultModel: draft?.defaultModel ?? null,
    usePlatformDefault: draft?.usePlatformDefault ?? false,
    loading: !draft && !loadError,
    loadError,
    saving,
    hasChanges,
    changedModelNames,
    defaultHasChanges,
    defaultIsValid,
    changeStatuses,
    changeDefault,
    resetDefault,
    discardChanges,
    saveChanges,
  }
}
