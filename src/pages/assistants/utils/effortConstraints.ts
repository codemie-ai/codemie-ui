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

import * as Yup from 'yup'

import { VALIDATION_MESSAGES } from '@/constants/validation'
import { appInfoStore } from '@/store/appInfo'
import { EffortLevel } from '@/types/entity/assistant'
import { ModelOption } from '@/types/entity/configuration'

// Components pass `useSnapshot(appInfoStore).llmModels`; the default store read is not reactive.
export function getEffortLevels(
  modelValue: string | undefined,
  models: readonly ModelOption[] = appInfoStore.llmModels
): EffortLevel[] {
  if (!modelValue) return []
  return models.find((m) => m.value === modelValue)?.effortLevels ?? []
}

export function buildEffortRule(): Yup.StringSchema {
  return Yup.string().when('llm_model_type', (values: unknown[], schema: Yup.StringSchema) => {
    const levels = getEffortLevels(values[0] as string | undefined)
    return levels.length
      ? schema.oneOf(
          [...levels, undefined] as (string | undefined)[],
          VALIDATION_MESSAGES.EFFORT_INVALID
        )
      : schema
  })
}

// xhigh and max can spend far more tokens than high, so they warn on every model that offers them.
const WARNING_EFFORT_LEVELS = new Set<string>([EffortLevel.XHIGH, EffortLevel.MAX])

export function isWarningEffortLevel(
  level: string | undefined,
  levels: EffortLevel[] = []
): boolean {
  if (!level) return false
  return WARNING_EFFORT_LEVELS.has(level) && levels.includes(level as EffortLevel)
}
