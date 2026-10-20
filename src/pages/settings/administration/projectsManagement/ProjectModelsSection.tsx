// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { ButtonSize, ButtonType } from '@/constants'
import { appInfoStore } from '@/store/appInfo'
import { projectModelSettingsStore } from '@/store/projectModelSettings'
import { ModelOption } from '@/types/entity/configuration'
import {
  DEFAULT_PROJECT_MODEL_SETTINGS,
  ProjectModelSettings,
} from '@/types/entity/projectModelSettings'
import { routerToModelOption } from '@/utils/routerToModelOption'
import toaster from '@/utils/toaster'

import DefaultModelsSelector from './components/DefaultModelsSelector'
import ModelConfigurationTable, { ModelSelectionState } from './components/ModelConfigurationTable'
import {
  getChecklistModels,
  getConfigurableModels,
  isModelAvailable,
  ProjectModelSetting,
  selectionToSettings,
  settingsToSelection,
} from './components/projectModelConfiguration'

interface Props {
  projectName: string
}

interface DraftState {
  selection: Record<string, ProjectModelSetting>
  defaultModel: string
}

const toDraft = (
  settings: ProjectModelSettings,
  models: readonly ModelOption[],
  globalDefault: string
): DraftState => ({
  selection: settingsToSelection(settings, models),
  defaultModel: settings.default_model ?? globalDefault,
})

const isSameDraft = (a: DraftState, b: DraftState) =>
  a.defaultModel === b.defaultModel &&
  Object.keys({ ...a.selection, ...b.selection }).every(
    (model) => a.selection[model] === b.selection[model]
  )

const ProjectModelsSection: FC<Props> = ({ projectName }) => {
  const [catalog, setCatalog] = useState<ModelOption[]>([])
  const [savedSettings, setSavedSettings] = useState<ProjectModelSettings | null>(null)
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [initialDraft, setInitialDraft] = useState<DraftState | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [navigationDialogVisible, setNavigationDialogVisible] = useState(false)

  const defaultModelCandidates = useMemo(() => getConfigurableModels(catalog), [catalog])
  const checklistModels = useMemo(() => getChecklistModels(catalog), [catalog])
  const globalDefaultModel = useMemo(
    () =>
      defaultModelCandidates.find((model) => model.isDefault)?.value ??
      defaultModelCandidates[0]?.value ??
      '',
    [defaultModelCandidates]
  )

  const loadProjectModels = useCallback(async () => {
    appInfoStore.invalidateProjectLLMModels(projectName)
  }, [projectName])

  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    Promise.all([
      appInfoStore.getLLMModels(),
      projectModelSettingsStore.fetchSettings(projectName),
      appInfoStore.getProjectLLMModels(projectName),
    ])
      .then(([availableModels, settings]) => {
        if (cancelled) return
        // getLLMModels lists concrete models only; routers live beside them in the store.
        const platformCatalog = [
          ...availableModels,
          ...appInfoStore.llmRouters.map(routerToModelOption),
        ]
        const configurable = getConfigurableModels(platformCatalog)
        const checklist = getChecklistModels(platformCatalog)
        const globalDefault =
          configurable.find((model) => model.isDefault)?.value ?? configurable[0]?.value ?? ''
        const nextDraft = toDraft(settings, checklist, globalDefault)
        setCatalog(platformCatalog)
        setSavedSettings(settings)
        setDraft(nextDraft)
        setInitialDraft(nextDraft)
      })
      .catch((error) => {
        console.error('Failed to load project model settings:', error)
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [projectName])

  const hasChanges = !!draft && !!initialDraft && !isSameDraft(draft, initialDraft)
  const defaultsDraft = useMemo(
    () => toDraft(DEFAULT_PROJECT_MODEL_SETTINGS, checklistModels, globalDefaultModel),
    [globalDefaultModel, checklistModels]
  )
  const isAtDefaults = !!draft && isSameDraft(draft, defaultsDraft)
  const availableModels = draft
    ? defaultModelCandidates.filter((model) => isModelAvailable(model, draft.selection, false))
    : []
  const checklistAvailableCount = draft
    ? checklistModels.filter((model) => isModelAvailable(model, draft.selection, false)).length
    : 0
  const defaultIsValid = availableModels.some((model) => model.value === draft?.defaultModel)
  const defaultModelError =
    !defaultIsValid && draft?.defaultModel ? 'Selected model is not available' : undefined

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash)
  )

  useEffect(() => {
    if (blocker.state === 'blocked') setNavigationDialogVisible(true)
  }, [blocker.state])

  useEffect(() => {
    if (!hasChanges) return () => undefined

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const updateDraft = (patch: Partial<DraftState>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current))

  const setModelEnabled = (model: ModelOption, enabled: boolean) =>
    setDraft((current) =>
      current
        ? {
            ...current,
            selection: { ...current.selection, [model.value]: enabled ? 'enabled' : 'disabled' },
          }
        : current
    )

  const resetToDefaults = () => {
    setDraft(defaultsDraft)
  }

  const applySaved = (saved: ProjectModelSettings) => {
    const savedDraft = toDraft(saved, checklistModels, globalDefaultModel)
    setSavedSettings(saved)
    setDraft(savedDraft)
    setInitialDraft(savedDraft)
  }

  const persistDraft = async (targetDraft: DraftState) => {
    if (!savedSettings) return false

    setSaving(true)
    try {
      const saved = await projectModelSettingsStore.saveSettings(projectName, {
        ...selectionToSettings(savedSettings, targetDraft.selection, 'disable'),
        default_model: targetDraft.defaultModel,
      })
      applySaved(saved)
      await loadProjectModels()
      toaster.success('Model settings updated')
      return true
    } finally {
      setSaving(false)
    }
  }

  const persistReset = async () => {
    setSaving(true)
    try {
      const saved = await projectModelSettingsStore.resetSettings(projectName)
      applySaved(saved)
      await loadProjectModels()
      toaster.success('Model settings updated')
      return true
    } finally {
      setSaving(false)
    }
  }

  const saveChanges = async () => {
    if (!draft || !hasChanges || !defaultIsValid) return false

    if (isSameDraft(draft, defaultsDraft)) return persistReset()
    return persistDraft(draft)
  }

  const cancelNavigation = () => {
    setNavigationDialogVisible(false)
    blocker.reset?.()
  }

  const discardChangesAndNavigate = () => {
    setDraft(initialDraft)
    setNavigationDialogVisible(false)
    blocker.proceed?.()
  }

  const applyChangesAndNavigate = async () => {
    if (await saveChanges()) {
      setNavigationDialogVisible(false)
      blocker.proceed?.()
    }
  }

  if (loadError) {
    return (
      <p className="pt-6 text-sm text-text-error" role="alert">
        Unable to load project model settings.
      </p>
    )
  }

  if (!draft) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pt-5 pb-8">
      <section>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-4">
              <h2 className="text-base font-semibold text-text-primary">Model configuration</h2>
              <span className="text-xs text-text-quaternary">
                {checklistAvailableCount} of {checklistModels.length} models available
              </span>
            </div>
            <p className="mt-1 text-sm text-text-quaternary">
              Choose which models are available in this project and set the default model. The
              selection applies to chats, assistants and workflows of the project.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size={ButtonSize.MEDIUM}
              variant={ButtonType.SECONDARY}
              onClick={resetToDefaults}
              disabled={isAtDefaults || saving}
            >
              Reset to global settings
            </Button>
            <Button
              size={ButtonSize.MEDIUM}
              variant={ButtonType.PRIMARY}
              onClick={saveChanges}
              disabled={!hasChanges || !defaultIsValid || saving}
            >
              Apply changes
            </Button>
          </div>
        </div>
      </section>

      <DefaultModelsSelector
        models={availableModels}
        defaultModel={draft.defaultModel}
        onDefaultChange={(defaultModel) => updateDraft({ defaultModel })}
        defaultModelError={defaultModelError}
      />

      <ModelConfigurationTable
        models={checklistModels}
        getSelectionState={(model) =>
          isModelAvailable(model, draft.selection, false)
            ? ModelSelectionState.Checked
            : ModelSelectionState.Unchecked
        }
        getDisabledReason={() => undefined}
        onSelectionChange={setModelEnabled}
      />

      <Popup
        visible={navigationDialogVisible}
        header="Unsaved changes"
        onHide={cancelNavigation}
        limitWidth
        hideClose
        footerContent={
          <div className="flex justify-end gap-2">
            <Button variant={ButtonType.BASE} onClick={cancelNavigation}>
              Cancel
            </Button>
            <Button variant={ButtonType.SECONDARY} onClick={discardChangesAndNavigate}>
              Discard changes
            </Button>
            <Button
              variant={ButtonType.PRIMARY}
              onClick={applyChangesAndNavigate}
              disabled={!defaultIsValid || saving}
            >
              Apply changes
            </Button>
          </div>
        }
      >
        <p className="mb-2 text-sm text-text-quaternary">
          You have unapplied changes to model settings. Apply them before leaving?
        </p>
      </Popup>
    </div>
  )
}

export default ProjectModelsSection
