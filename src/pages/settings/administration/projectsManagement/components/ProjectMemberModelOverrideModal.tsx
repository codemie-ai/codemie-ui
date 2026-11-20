// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useEffect, useMemo, useState } from 'react'

import ConfirmationModal from '@/components/ConfirmationModal'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { ModelOption } from '@/types/entity/configuration'
import { ProjectModelSettings } from '@/types/entity/projectModelSettings'
import { UserListItem } from '@/types/entity/user'
import toaster from '@/utils/toaster'

import DefaultModelsSelector from './DefaultModelsSelector'
import ModelConfigurationTable, { ModelSelectionState } from './ModelConfigurationTable'
import ModelSettingsActions from './ModelSettingsActions'
import {
  getDefaultModelStatus,
  isModelAllowed,
  ModelOverrideValue,
} from './projectModelConfiguration'
import { useProjectModelCatalog } from '../hooks/useProjectModelCatalog'

export type { ModelOverrideValue }
export type ModelOverrideMap = Record<string, ModelOverrideValue>

interface Props {
  isOpen: boolean
  users: UserListItem[]
  projectName: string
  /** The single selected user's current explicit per-model overrides; empty when they have no override. */
  projectOverrides?: ModelOverrideMap
  /** Every selected user's current explicit per-model overrides, keyed by user id — used for bulk edits. */
  projectOverridesByUser?: Record<string, ModelOverrideMap>
  /** The single selected user's current custom default model. */
  defaultModel?: string
  /** Every selected user's current custom default model, keyed by user id — used for bulk edits. */
  defaultModelsByUser?: Record<string, string>
  onClose: () => void
  onApply: (
    overrides: ModelOverrideMap,
    defaultModel: string | undefined,
    hasCustomDefault: boolean,
    projectAvailability: Record<string, boolean>
  ) => Promise<void>
}

const EMPTY_MODEL_OVERRIDE_MAP: ModelOverrideMap = {}
const EMPTY_MODEL_OVERRIDES_BY_USER: Record<string, ModelOverrideMap> = {}
const EMPTY_DEFAULTS_BY_USER: Record<string, string> = {}
const EMPTY_AVAILABILITY: Record<string, boolean> = {}

interface LoadedState {
  models: ModelOption[]
  /** Whether the project's own configuration makes each model available (what "project" resolves to). */
  projectAvailability: Record<string, boolean>
  projectDefault: string | undefined
}

const getProjectDefault = (models: readonly ModelOption[], settings: ProjectModelSettings) => {
  const values = models.map((model) => model.value)
  if (settings.default_model && values.includes(settings.default_model)) {
    return settings.default_model
  }
  return models.find((model) => model.isDefault)?.value ?? models[0]?.value
}

// Bulk edit shows the union of every selected user's effective models: a user without an
// override contributes the project's available models, one with an override contributes their
// own list. A model nobody has stays unchecked.
const getBulkSetting = (
  modelValue: string,
  users: readonly UserListItem[],
  overridesByUser: Record<string, ModelOverrideMap>,
  projectAvailability: Record<string, boolean>
): ModelOverrideValue => {
  if (users.every((user) => !overridesByUser[user.id])) return 'project'
  const isEnabledForSomeUser = users.some((user) => {
    const userOverrides = overridesByUser[user.id]
    return userOverrides ? userOverrides[modelValue] === 'enabled' : projectAvailability[modelValue]
  })
  return isEnabledForSomeUser ? 'enabled' : 'disabled'
}

const getMixedModelValues = (
  models: readonly ModelOption[],
  users: readonly UserListItem[],
  overridesByUser: Record<string, ModelOverrideMap>,
  projectAvailability: Record<string, boolean>
): Set<string> => {
  if (users.length < 2) return new Set()
  return new Set(
    models
      .filter((model) => {
        const flags = users.map((user) => {
          const userOverrides = overridesByUser[user.id]
          return userOverrides
            ? userOverrides[model.value] === 'enabled'
            : !!projectAvailability[model.value]
        })
        return flags.some(Boolean) && !flags.every(Boolean)
      })
      .map((model) => model.value)
  )
}

const ProjectMemberModelOverrideModal: FC<Props> = ({
  isOpen,
  users,
  projectName,
  projectOverrides = EMPTY_MODEL_OVERRIDE_MAP,
  projectOverridesByUser = EMPTY_MODEL_OVERRIDES_BY_USER,
  defaultModel: suppliedDefaultModel,
  defaultModelsByUser = EMPTY_DEFAULTS_BY_USER,
  onClose,
  onApply,
}) => {
  const [loaded, setLoaded] = useState<LoadedState | null>(null)
  const [overrides, setOverrides] = useState<ModelOverrideMap>({})
  const [initialOverrides, setInitialOverrides] = useState<ModelOverrideMap>({})
  const [defaultModel, setDefaultModel] = useState<string | undefined>()
  const [initialDefaultModel, setInitialDefaultModel] = useState<string | undefined>()
  const [defaultModelMixed, setDefaultModelMixed] = useState(false)
  const [initialDefaultModelMixed, setInitialDefaultModelMixed] = useState(false)
  const [mixedModels, setMixedModels] = useState<Set<string>>(new Set())
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const userIdsKey = users.map((user) => user.id).join(',')

  const isActive = isOpen && users.length > 0
  // The override is per-user and independent of the project's own model allow/deny-list
  // configuration: it offers every platform-enabled, non-router model so an admin can also
  // grant a user access to a model outside the project's set.
  const { data: catalog, error: catalogError } = useProjectModelCatalog(projectName, {
    includeRouters: false,
    hidePremium: true,
    enabled: isActive,
  })

  useEffect(() => {
    if (!isActive) setIsSubmitting(false)
  }, [isActive])

  useEffect(() => {
    if (!catalogError) return
    console.error('Failed to load member model settings:', catalogError)
    toaster.error('Failed to load model settings')
  }, [catalogError])

  useEffect(() => {
    if (!catalog) {
      setLoaded(null)
      return
    }
    const { models, availability: projectAvailability, settings } = catalog
    const projectDefault = getProjectDefault(
      models.filter((model) => projectAvailability[model.value]),
      settings
    )

    const initial: ModelOverrideMap =
      users.length === 1
        ? Object.fromEntries(
            models.map((model) => [model.value, projectOverrides[model.value] ?? 'project'])
          )
        : Object.fromEntries(
            models.map((model) => [
              model.value,
              getBulkSetting(model.value, users, projectOverridesByUser, projectAvailability),
            ])
          )

    let nextDefault: string | undefined = suppliedDefaultModel ?? projectDefault
    let nextDefaultMixed = false
    if (users.length > 1) {
      const defaults = users.map((user) => defaultModelsByUser[user.id] ?? projectDefault)
      nextDefaultMixed = !defaults.every((value) => value === defaults[0])
      nextDefault = nextDefaultMixed ? undefined : defaults[0]
    }

    setLoaded({ models, projectAvailability, projectDefault })
    setMixedModels(getMixedModelValues(models, users, projectOverridesByUser, projectAvailability))
    setOverrides(initial)
    setInitialOverrides(initial)
    setDefaultModel(nextDefault)
    setInitialDefaultModel(nextDefault)
    setDefaultModelMixed(nextDefaultMixed)
    setInitialDefaultModelMixed(nextDefaultMixed)
    setIsResetConfirmationOpen(false)
    // users are identified by id; a new array with the same members must not reset edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, userIdsKey])

  const models = loaded?.models ?? []
  const projectDefault = loaded?.projectDefault
  const projectAvailability = loaded?.projectAvailability ?? EMPTY_AVAILABILITY

  const isEffectivelyEnabled = (model: ModelOption) =>
    isModelAllowed(model.value, overrides[model.value] ?? 'project', projectAvailability)

  const title =
    users.length === 1
      ? `Model Override — ${users[0].name || users[0].email}`
      : `Model Override — ${users.length} users`

  const hasChanges = useMemo(
    () =>
      models.some(
        (model) =>
          (overrides[model.value] ?? 'project') !== (initialOverrides[model.value] ?? 'project')
      ) ||
      defaultModel !== initialDefaultModel ||
      defaultModelMixed !== initialDefaultModelMixed,
    [
      defaultModel,
      defaultModelMixed,
      initialDefaultModel,
      initialDefaultModelMixed,
      initialOverrides,
      models,
      overrides,
    ]
  )

  // A default that just got disabled would stay selected on a row whose checkbox is locked,
  // leaving Apply disabled with no visible way out; move it to the project default or the
  // first model still enabled instead.
  useEffect(() => {
    if (!loaded || defaultModelMixed) return
    const enabled = models.filter(isEffectivelyEnabled)
    if (defaultModel && enabled.some((model) => model.value === defaultModel)) return
    const next = enabled.find((model) => model.value === projectDefault)?.value ?? enabled[0]?.value
    if (next !== defaultModel) setDefaultModel(next)
  }, [defaultModel, defaultModelMixed, loaded, models, overrides, projectDefault])

  const enabledModels = models.filter(isEffectivelyEnabled)
  const hasUserOverrides = models.some(
    (model) => (overrides[model.value] ?? 'project') !== 'project'
  )
  const hasCustomDefault = defaultModelMixed || defaultModel !== projectDefault
  const { isValid: defaultIsValid, error: defaultModelError } = getDefaultModelStatus(
    enabledModels,
    defaultModelMixed ? undefined : defaultModel
  )
  const userName = users.length === 1 ? users[0].name || users[0].email : `${users.length} users`

  const getSelectionState = (model: ModelOption): ModelSelectionState => {
    if (mixedModels.has(model.value)) return ModelSelectionState.Mixed
    return isEffectivelyEnabled(model) ? ModelSelectionState.Checked : ModelSelectionState.Unchecked
  }

  const setModelEnabled = (model: ModelOption, checked: boolean) => {
    setMixedModels((current) => {
      if (!current.has(model.value)) return current
      const next = new Set(current)
      next.delete(model.value)
      return next
    })
    setOverrides((current) => ({ ...current, [model.value]: checked ? 'enabled' : 'disabled' }))
  }

  const resetToProjectSettings = () => {
    setMixedModels(new Set())
    setOverrides(
      Object.fromEntries(models.map((model) => [model.value, 'project'])) as ModelOverrideMap
    )
    setDefaultModel(projectDefault)
    setDefaultModelMixed(false)
    setIsResetConfirmationOpen(false)
  }

  const handleApply = async () => {
    setIsSubmitting(true)
    try {
      await onApply(overrides, defaultModel, hasCustomDefault, projectAvailability)
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
        <div className="flex w-full items-center gap-2">
          <ModelSettingsActions
            resetLabel="Reset to project settings"
            onReset={() => setIsResetConfirmationOpen(true)}
            resetDisabled={!hasUserOverrides && !hasCustomDefault}
            onCancel={onClose}
            onApply={handleApply}
            applyDisabled={!hasChanges && users.length === 1}
            defaultIsValid={defaultIsValid}
            busy={isSubmitting}
          />
        </div>
      }
    >
      {models.length > 0 && (
        <div className="mb-4">
          {defaultModelMixed && (
            <div className="mb-2 text-xs text-text-quaternary">
              Default models differ across selected users.
            </div>
          )}
          <DefaultModelsSelector
            label="Default model"
            models={enabledModels}
            defaultModel={defaultModel ?? ''}
            onDefaultChange={(modelValue) => {
              setDefaultModel(modelValue)
              setDefaultModelMixed(false)
            }}
            defaultModelError={defaultModelError}
          />
        </div>
      )}
      <ModelConfigurationTable
        models={models}
        getSelectionState={getSelectionState}
        onSelectionChange={setModelEnabled}
        emptyMessage="No models are available in this project."
      />
      <div className="mt-3 text-xs text-text-quaternary">
        Overrides apply to this member(s) only, across every model enabled on the platform —
        independent of this project&apos;s own model configuration.
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
