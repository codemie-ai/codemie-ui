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
 * Update Headroom Action
 *
 * Writes or drops the `headroom` override block on a workflow config or an assistant actor.
 */

import { HeadroomOverride } from '@/types/entity/assistant'
import { AssistantConfiguration, WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { ActionResult } from '@/utils/workflowEditor/actions'
import { buildHeadroom } from '@/utils/workflowEditor/headroom/headroomYaml'

/** Workflow level (`assistantId` omitted) or the matching `assistants[]` entry. */
export const updateHeadroom = (
  config: WorkflowConfiguration,
  headroom: HeadroomOverride | undefined,
  assistantId?: string
): ActionResult => {
  if (!assistantId) {
    return { config: { ...config, headroom: buildHeadroom(headroom) } }
  }

  const assistants = (config.assistants ?? []).map((a: AssistantConfiguration) =>
    a.id === assistantId ? { ...a, headroom: buildHeadroom(headroom) } : a
  )
  return { config: { ...config, assistants } }
}
