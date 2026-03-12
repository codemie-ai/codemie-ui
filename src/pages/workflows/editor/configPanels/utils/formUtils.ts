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

import { CommonStateConfiguration, NextState } from '@/types/workflowEditor/configuration'

import { CommonNodeFieldValues } from '../CommonStateFields'

export const buildCommonStateConfig = (
  commonValues: CommonNodeFieldValues,
  existingState?: CommonStateConfiguration
): CommonStateConfiguration => {
  return {
    id: commonValues.id,
    task: commonValues.task,
    output_schema: commonValues.output_schema,
    interrupt_before: commonValues.interrupt_before,
    retry_policy: commonValues.retry_policy,
    finish_iteration: commonValues.finish_iteration,
    resolve_dynamic_values_in_prompt: commonValues.resolve_dynamic_values_in_prompt,
    result_as_human_message: commonValues.result_as_human_message,
    next: buildNextStateConfig(commonValues.next, existingState?.next),
  }
}

/**
 * Normalizes boolean fields for backend:
 * - true (default) → undefined (backend interprets as true)
 * - false → false (explicitly set to false)
 * - undefined → undefined
 */
const normalizeBooleanField = (value: boolean | undefined) => {
  if (value === false) {
    return false
  }
  // eslint-disable-next-line consistent-return
  return undefined
}

const buildNextStateConfig = (
  nextValues: CommonNodeFieldValues['next'],
  existingNext?: NextState
): NextState | undefined => {
  if (!nextValues) {
    return existingNext
  }

  // For include_in_llm_history and store_in_context:
  // - true (default) → undefined (backend interprets as true)
  // - false → false (explicitly set to false)
  const includeInHistory = normalizeBooleanField(nextValues.include_in_llm_history)
  const storeInContext = normalizeBooleanField(nextValues.store_in_context)

  return {
    ...existingNext,
    output_key: nextValues.output_key || undefined,
    append_to_context: nextValues.append_to_context ? true : undefined,
    include_in_llm_history: includeInHistory,
    store_in_context: storeInContext,
    // These fields: true → true, false/undefined → undefined
    override_task: nextValues.override_task ? true : undefined,
    clear_prior_messages: nextValues.clear_prior_messages ? true : undefined,
    clear_context_store: nextValues.clear_context_store
      ? nextValues.clear_context_store
      : undefined,
    reset_keys_in_context_store:
      nextValues.reset_keys_in_context_store && nextValues.reset_keys_in_context_store.length > 0
        ? nextValues.reset_keys_in_context_store
        : undefined,
  }
}
