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

/**
 * Update General Config Action
 *
 * Handles updating advanced workflow configuration settings
 * (summarization, performance, retry policy, etc.)
 */

import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { ActionResult } from '@/utils/workflowEditor/actions'

/* Removes null/undefined advanced config values and merges into main YAML config */
export const updateAdvancedConfig = (
  config: WorkflowConfiguration,
  generalConfigUpdate: Partial<WorkflowConfiguration>
): ActionResult => {
  const newConfig = Object.keys({ ...config, ...generalConfigUpdate }).reduce((acc, key) => {
    const updateValue = generalConfigUpdate[key as keyof WorkflowConfiguration]
    const configValue = config[key as keyof WorkflowConfiguration]

    const value = key in generalConfigUpdate ? updateValue : configValue

    if (value !== null && value !== undefined) {
      ;(acc as any)[key] = value
    }

    return acc
  }, {} as WorkflowConfiguration)

  return { config: newConfig }
}
