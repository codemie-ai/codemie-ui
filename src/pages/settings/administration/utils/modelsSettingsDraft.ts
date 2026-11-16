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

import { AdminGlobalDefaultResponse, AdminModel } from '@/types/entity/adminModel'
import { ModelStatus } from '@/types/entity/configuration'

export interface ModelsSettingsDraft {
  statuses: Record<string, ModelStatus>
  defaultModel: string | null
  usePlatformDefault?: boolean
}

export const isModelStatusEditable = (model: AdminModel) => model.routerType !== 'switchyard'

export const isSelectableDefaultModel = (model: AdminModel) =>
  model.modelType === 'chat' &&
  model.enabled &&
  model.status === 'enabled' &&
  isModelStatusEditable(model)

export const toModelsSettingsDraft = (
  models: readonly AdminModel[],
  globalDefault: AdminGlobalDefaultResponse
): ModelsSettingsDraft => ({
  statuses: Object.fromEntries(
    models.filter(isModelStatusEditable).map((model) => [model.base_name, model.status])
  ),
  defaultModel: globalDefault.effective_base_name,
  usePlatformDefault: globalDefault.saved_base_name == null,
})

export const isSameDefaultSelection = (a: ModelsSettingsDraft, b: ModelsSettingsDraft) =>
  !!a.usePlatformDefault === !!b.usePlatformDefault &&
  (a.usePlatformDefault || a.defaultModel === b.defaultModel)

export const isSameModelsSettingsDraft = (a: ModelsSettingsDraft, b: ModelsSettingsDraft) =>
  isSameDefaultSelection(a, b) &&
  Object.keys({ ...a.statuses, ...b.statuses }).every(
    (baseName) => a.statuses[baseName] === b.statuses[baseName]
  )

export const modelsWithDraftStatuses = (
  models: readonly AdminModel[],
  draft: ModelsSettingsDraft | null
): AdminModel[] =>
  models.map((model) => ({
    ...model,
    status: isModelStatusEditable(model)
      ? draft?.statuses[model.base_name] ?? model.status
      : model.status,
  }))

export const updateDraftStatuses = (
  draft: ModelsSettingsDraft,
  models: readonly AdminModel[],
  baseNames: string[],
  status: ModelStatus
): ModelsSettingsDraft => {
  const next = {
    ...draft,
    statuses: {
      ...draft.statuses,
      ...Object.fromEntries(
        models
          .filter((model) => isModelStatusEditable(model) && baseNames.includes(model.base_name))
          .map((model) => [model.base_name, status])
      ),
    },
  }
  const selectable = modelsWithDraftStatuses(models, next).filter(isSelectableDefaultModel)
  if (!selectable.some((model) => model.base_name === next.defaultModel)) {
    next.defaultModel = selectable[0]?.base_name ?? null
  }
  return next
}
