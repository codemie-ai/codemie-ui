// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { ModelOption } from '@/types/entity/configuration'
import { ModelAvailabilityMode, ProjectModelSettings } from '@/types/entity/projectModelSettings'

export type ProjectModelSetting = 'enabled' | 'disabled'

/** What happens to models added to the platform after the project was configured. */
export type NewModelsPolicy = 'enable' | 'disable'

export const getNewModelsPolicy = (mode: ModelAvailabilityMode): NewModelsPolicy =>
  mode === 'allow_list' ? 'disable' : 'enable'

/** Routers are governed by the auto-routing switch, not by the model checklist. */
export const getConfigurableModels = (models: readonly ModelOption[]) =>
  models.filter((model) => !model.isRouter)

export const getRouterModels = (models: readonly ModelOption[]) =>
  models.filter((model) => model.isRouter)

/** Checklist state derived from the stored list; premium hiding is applied separately. */
export const settingsToSelection = (
  settings: ProjectModelSettings,
  models: readonly ModelOption[]
): Record<string, ProjectModelSetting> => {
  const listed = new Set(settings.models)
  return Object.fromEntries(
    models.map((model) => {
      let enabled = true
      if (settings.mode === 'allow_list') enabled = listed.has(model.value)
      if (settings.mode === 'deny_list') enabled = !listed.has(model.value)
      return [model.value, enabled ? 'enabled' : 'disabled']
    })
  )
}

/** Stores the checklist as the smallest list that reproduces it under the chosen policy. */
export const selectionToSettings = (
  base: ProjectModelSettings,
  selection: Record<string, ProjectModelSetting>,
  policy: NewModelsPolicy
): ProjectModelSettings => {
  const entries = Object.entries(selection)
  if (policy === 'disable') {
    return {
      ...base,
      mode: 'allow_list',
      models: entries.filter(([, value]) => value === 'enabled').map(([model]) => model),
    }
  }
  const disabled = entries.filter(([, value]) => value === 'disabled').map(([model]) => model)
  return { ...base, mode: disabled.length ? 'deny_list' : 'all', models: disabled }
}

export const isModelAvailable = (
  model: ModelOption,
  selection: Record<string, ProjectModelSetting>,
  hidePremiumModels: boolean
) => selection[model.value] === 'enabled' && !(hidePremiumModels && model.isPremium)

/**
 * Mirrors the backend rule for routers: a router is offered only when auto routing is on and
 * the project restricts nothing it could route to. Router candidates are not exposed to the
 * UI, so an unrestricted project is the only state in which availability is certain.
 */
export const describeRouterAvailability = (
  autoRoutingEnabled: boolean,
  selection: Record<string, ProjectModelSetting>,
  hidePremiumModels: boolean
): string => {
  if (!autoRoutingEnabled) return 'Automatic routing is off for this project.'
  const restricted =
    hidePremiumModels || Object.values(selection).some((value) => value === 'disabled')
  return restricted
    ? 'Routers are offered only when every model they can route to is enabled in this project.'
    : 'Routers are offered in model pickers of this project.'
}
