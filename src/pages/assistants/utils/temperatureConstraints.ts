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

import { VALIDATION_CONSTRAINTS, VALIDATION_MESSAGES } from '@/constants/validation'
import { appInfoStore } from '@/store/appInfo'
import { ModelOption } from '@/types/entity/configuration'

// Extend this table to add per-provider or per-model constraints.
// First matching rule wins; models that match none fall back to `default`.
interface TemperatureRule {
  providers: Set<string>
  nameMatch: RegExp
  max: number
  message: string
}

const TEMPERATURE_RULES: TemperatureRule[] = [
  {
    providers: new Set(['aws_bedrock', 'google_vertexai']),
    nameMatch: /claude/i,
    max: VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_CLAUDE,
    message: VALIDATION_MESSAGES.TEMPERATURE_MAX_CLAUDE,
  },
]

const DEFAULT_RULE = {
  max: VALIDATION_CONSTRAINTS.TEMPERATURE_MAX_STANDARD,
  message: VALIDATION_MESSAGES.TEMPERATURE_MAX_STANDARD,
}

function matchRule(provider: string | undefined, value: string): TemperatureRule | undefined {
  return TEMPERATURE_RULES.find(
    (r) => provider !== undefined && r.providers.has(provider) && r.nameMatch.test(value)
  )
}

// True when the model matches any capped-provider rule. Exported for external checks
// (e.g. tests) that want the predicate independently of `getTemperatureMax`.
export function isClaudeOnAnthropicProvider(model: ModelOption | undefined): boolean {
  if (!model?.provider) return false
  return matchRule(model.provider, model.value) !== undefined
}

// Resolves the temperature ceiling for a given model.
// Store miss (in-flight fetch, `getLLMModels` failure) falls back to a name-based
// check so Claude on EditAssistant still gets the stricter cap.
export function getTemperatureMax(modelValue: string | undefined): number {
  if (!modelValue) return DEFAULT_RULE.max
  const model = appInfoStore.llmModels.find((m) => m.value === modelValue)
  if (model) {
    return matchRule(model.provider, model.value)?.max ?? DEFAULT_RULE.max
  }
  // Store miss: match by name only against every rule.
  const byName = TEMPERATURE_RULES.find((r) => r.nameMatch.test(modelValue))
  return byName?.max ?? DEFAULT_RULE.max
}

function messageForMax(max: number): string {
  return TEMPERATURE_RULES.find((r) => r.max === max)?.message ?? DEFAULT_RULE.message
}

// `Yup.when(...)` runs at validation time, so reading the Valtio store from the
// callback is safe (both consumer forms load the model list on mount).
export function buildTemperatureRule(): Yup.NumberSchema {
  return Yup.number()
    .min(VALIDATION_CONSTRAINTS.TEMPERATURE_MIN, VALIDATION_MESSAGES.TEMPERATURE_MIN)
    .when('llm_model_type', (values: unknown[], schema: Yup.NumberSchema) => {
      const modelValue = values[0] as string | undefined
      const max = getTemperatureMax(modelValue)
      return schema.max(max, messageForMax(max))
    })
    .transform((value, originalValue) => (originalValue === '' ? undefined : value))
    .typeError(VALIDATION_MESSAGES.TEMPERATURE_TYPE)
}
