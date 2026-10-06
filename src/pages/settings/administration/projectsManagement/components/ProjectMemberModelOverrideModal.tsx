// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useEffect, useMemo, useState } from 'react'

import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType } from '@/constants'
import { appInfoStore } from '@/store/appInfo'
import { projectModelSettingsStore } from '@/store/projectModelSettings'
import { ModelOption } from '@/types/entity/configuration'
import { MemberModelOverride, ProjectModelSettings } from '@/types/entity/projectModelSettings'
import { UserListItem } from '@/types/entity/user'
import toaster from '@/utils/toaster'

import ModelConfigurationTable, { ModelSelectionState } from './ModelConfigurationTable'
import {
  getConfigurableModels,
  isModelAvailable,
  settingsToSelection,
} from './projectModelConfiguration'

export type ModelOverrideValue = 'project' | 'disabled' | 'mixed'
export type ModelOverrideMap = Record<string, ModelOverrideValue>

interface Props {
  isOpen: boolean
  users: UserListItem[]
  projectName: string
  onClose: () => void
  onApplied?: () => void
}

interface LoadedState {
  models: ModelOption[]
  projectDefault: string | undefined
  settings: ProjectModelSettings
}

/** Models available in the project, i.e. the only ones a member override can narrow. */
const getProjectModels = (catalog: readonly ModelOption[], settings: ProjectModelSettings) => {
  const configurable = getConfigurableModels(catalog)
  const selection = settingsToSelection(settings, configurable)
  return configurable.filter((model) =>
    isModelAvailable(model, selection, settings.hide_premium_models)
  )
}

const getProjectDefault = (models: readonly ModelOption[], settings: ProjectModelSettings) => {
  const values = models.map((model) => model.value)
  if (settings.default_model && values.includes(settings.default_model)) {
    return settings.default_model
  }
  return models.find((model) => model.isDefault)?.value ?? models[0]?.value
}

const getUserOverride = (settings: ProjectModelSettings, userId: string) =>
  settings.member_overrides[userId]

const getModelOverrideForUsers = (
  model: ModelOption,
  users: readonly UserListItem[],
  settings: ProjectModelSettings
): ModelOverrideValue => {
  const values = users.map((user) =>
    getUserOverride(settings, user.id)?.disabled_models.includes(model.value)
      ? 'disabled'
      : 'project'
  )
  return values.every((value) => value === values[0]) ? values[0] : 'mixed'
}

const computeInitialOverrides = (
  models: readonly ModelOption[],
  users: readonly UserListItem[],
  settings: ProjectModelSettings
): ModelOverrideMap =>
  Object.fromEntries(
    models.map((model) => [model.value, getModelOverrideForUsers(model, users, settings)])
  )

const ProjectMemberModelOverrideModal: FC<Props> = ({
  isOpen,
  users,
  projectName,
  onClose,
  onApplied,
}) => {
  const [loaded, setLoaded] = useState<LoadedState | null>(null)
  const [overrides, setOverrides] = useState<ModelOverrideMap>({})
  const [initialOverrides, setInitialOverrides] = useState<ModelOverrideMap>({})
  const [defaultModel, setDefaultModel] = useState<string | undefined>()
  const [initialDefaultModel, setInitialDefaultModel] = useState<string | undefined>()
  const [defaultModelMixed, setDefaultModelMixed] = useState(false)
  const [initialDefaultModelMixed, setInitialDefaultModelMixed] = useState(false)
  const [codeDefaultModel, setCodeDefaultModel] = useState<string | undefined>()
  const [initialCodeDefaultModel, setInitialCodeDefaultModel] = useState<string | undefined>()
  const [codeDefaultModelMixed, setCodeDefaultModelMixed] = useState(false)
  const [initialCodeDefaultModelMixed, setInitialCodeDefaultModelMixed] = useState(false)
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userIdsKey = users.map((user) => user.id).join(',')

  useEffect(() => {
    let cancelled = false
    if (!isOpen || !users.length) {
      setLoaded(null)
      return () => {
        cancelled = true
      }
    }
    Promise.all([appInfoStore.getLLMModels(), projectModelSettingsStore.fetchSettings(projectName)])
      .then(([catalog, settings]) => {
        if (cancelled) return
        const models = getProjectModels(catalog, settings)
        const projectDefault = getProjectDefault(models, settings)

        const initial = computeInitialOverrides(models, users, settings)
        const defaults = users.map(
          (user) => getUserOverride(settings, user.id)?.default_model ?? projectDefault
        )
        const mixed = !defaults.every((value) => value === defaults[0])
        const nextDefault = mixed ? undefined : defaults[0]
        const codeDefaults = users.map(() => projectDefault)
        const codeMixed = !codeDefaults.every((value) => value === codeDefaults[0])
        const nextCodeDefault = codeMixed ? undefined : codeDefaults[0]

        setLoaded({ models, projectDefault, settings })
        setOverrides(initial)
        setInitialOverrides(initial)
        setDefaultModel(nextDefault)
        setInitialDefaultModel(nextDefault)
        setDefaultModelMixed(mixed)
        setInitialDefaultModelMixed(mixed)
        setCodeDefaultModel(nextCodeDefault)
        setInitialCodeDefaultModel(nextCodeDefault)
        setCodeDefaultModelMixed(codeMixed)
        setInitialCodeDefaultModelMixed(codeMixed)
        setIsResetConfirmationOpen(false)
      })
      .catch((error) => {
        console.error('Failed to load member model settings:', error)
        if (!cancelled) toaster.error('Failed to load model settings')
      })
    return () => {
      cancelled = true
    }
    // users are identified by id; a new array with the same members must not reset edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectName, userIdsKey])

  const models = loaded?.models ?? []
  const projectDefault = loaded?.projectDefault

  const title =
    users.length === 1
      ? `Model Override — ${users[0].name || users[0].email}`
      : `Model Override — ${users.length} users`

  const hasChanges = useMemo(
    () =>
      models.some((model) => overrides[model.value] !== initialOverrides[model.value]) ||
      defaultModel !== initialDefaultModel ||
      defaultModelMixed !== initialDefaultModelMixed ||
      codeDefaultModel !== initialCodeDefaultModel ||
      codeDefaultModelMixed !== initialCodeDefaultModelMixed,
    [
      codeDefaultModel,
      codeDefaultModelMixed,
      defaultModel,
      defaultModelMixed,
      initialCodeDefaultModel,
      initialCodeDefaultModelMixed,
      initialDefaultModel,
      initialDefaultModelMixed,
      initialOverrides,
      models,
      overrides,
    ]
  )
  // A default that just got disabled would stay selected on a row whose radio is locked, leaving
  // Apply disabled with no visible way out; move it to the project default or the first
  // model still enabled instead.
  useEffect(() => {
    if (!loaded || defaultModelMixed) return
    const enabled = models.filter((model) => overrides[model.value] !== 'disabled')
    if (defaultModel && enabled.some((model) => model.value === defaultModel)) return
    const next = enabled.find((model) => model.value === projectDefault)?.value ?? enabled[0]?.value
    if (next !== defaultModel) setDefaultModel(next)
  }, [defaultModel, defaultModelMixed, loaded, models, overrides, projectDefault])

  const enabledModelCount = models.filter((model) => overrides[model.value] !== 'disabled').length
  const hasUserOverrides = models.some((model) => overrides[model.value] !== 'project')
  const hasCustomDefault = defaultModelMixed || defaultModel !== projectDefault
  const defaultIsValid =
    defaultModelMixed ||
    (defaultModel != null &&
      models.some((model) => model.value === defaultModel && overrides[model.value] !== 'disabled'))
  const userName = users.length === 1 ? users[0].name || users[0].email : `${users.length} users`

  const getSelectionState = (model: ModelOption): ModelSelectionState => {
    const value = overrides[model.value] ?? 'project'
    if (value === 'mixed') return 'mixed'
    return value === 'disabled' ? 'unchecked' : 'checked'
  }

  const setModelEnabled = (model: ModelOption, checked: boolean) => {
    setOverrides((current) => ({ ...current, [model.value]: checked ? 'project' : 'disabled' }))
  }

  const resetToProjectSettings = () => {
    setOverrides(Object.fromEntries(models.map((model) => [model.value, 'project'])))
    setDefaultModel(projectDefault)
    setDefaultModelMixed(false)
    setCodeDefaultModel(projectDefault)
    setCodeDefaultModelMixed(false)
    setIsResetConfirmationOpen(false)
  }

  const buildUserOverride = (userId: string): MemberModelOverride | null => {
    const existing = loaded ? getUserOverride(loaded.settings, userId) : undefined
    const disabled = models
      .filter((model) => {
        const value = overrides[model.value]
        // a 'mixed' row was not touched: keep each member's own state
        return value === 'mixed'
          ? existing?.disabled_models.includes(model.value)
          : value === 'disabled'
      })
      .map((model) => model.value)
    const memberDefault = defaultModelMixed ? existing?.default_model ?? null : defaultModel
    // A mixed default left untouched is this member's own prior default; the same bulk edit
    // may just have disabled that exact model for them, so re-validate it against `disabled`
    // rather than trusting the stale value — an inconsistent override would point the member's
    // default at a model they can no longer use.
    const validMemberDefault =
      memberDefault && !disabled.includes(memberDefault) ? memberDefault : null
    const override = {
      disabled_models: disabled,
      default_model:
        validMemberDefault && validMemberDefault !== projectDefault ? validMemberDefault : null,
    }
    return override.disabled_models.length || override.default_model ? override : null
  }

  const applyChanges = async () => {
    setIsSubmitting(true)
    try {
      await projectModelSettingsStore.saveMemberOverrides(
        projectName,
        Object.fromEntries(users.map((user) => [user.id, buildUserOverride(user.id)]))
      )
      toaster.success(
        users.length === 1
          ? 'Model overrides updated'
          : `Model overrides updated for ${users.length} users`
      )
      onApplied?.()
      onClose()
    } catch {
      // store already reported the error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popup
      visible={isOpen}
      onHide={onClose}
      header={title}
      isFullWidth
      bodyClassName="max-h-[calc(90vh-200px)] overflow-y-auto"
      footerContent={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            size={ButtonSize.MEDIUM}
            variant={ButtonType.SECONDARY}
            onClick={() => setIsResetConfirmationOpen(true)}
            disabled={(!hasUserOverrides && !hasCustomDefault) || isSubmitting}
          >
            Reset to project settings
          </Button>
          <div className="flex justify-end gap-2">
            <Button size={ButtonSize.MEDIUM} variant={ButtonType.SECONDARY} onClick={onClose}>
              Cancel
            </Button>
            <Button
              size={ButtonSize.MEDIUM}
              variant={ButtonType.PRIMARY}
              onClick={applyChanges}
              disabled={!hasChanges || !defaultIsValid || isSubmitting}
            >
              Apply changes
            </Button>
          </div>
        </div>
      }
    >
      <ModelConfigurationTable
        models={models}
        getSelectionState={getSelectionState}
        onSelectionChange={setModelEnabled}
        emptyMessage="No models are available in this project."
      />
      {models.length > 0 && !defaultIsValid && (
        <p className="mt-3 text-sm text-text-error" role="alert">
          {enabledModelCount
            ? 'Choose a default model among the enabled ones'
            : 'Keep at least one model enabled for the member'}
        </p>
      )}
      <div className="mt-3 text-xs text-text-quaternary">
        Member overrides can only narrow the models available in the project.
      </div>
      <ConfirmationModal
        visible={isResetConfirmationOpen}
        header="Reset model settings?"
        message={`All custom model settings for ${userName} will be removed. This will restore project settings.`}
        confirmText="Reset to project settings"
        confirmButtonType={ButtonType.PRIMARY}
        hideIcon
        onCancel={() => setIsResetConfirmationOpen(false)}
        onConfirm={resetToProjectSettings}
      />
    </Popup>
  )
}

export default ProjectMemberModelOverrideModal
