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

import StatusBadge, { StatusEnum } from '@/components/StatusBadge'
import { TOOLKITS } from '@/constants/assistants'
import { AssistantContext, AssistantToolkit, ContextType } from '@/types/entity/assistant'

// Git tools need a CODE datasource to know which repository to work with.
// An undefined context means the form has not loaded it yet, so no hint is shown.
export const isGitDatasourceMissing = (
  toolkits: AssistantToolkit[],
  context: AssistantContext[] | undefined
): boolean => {
  if (!Array.isArray(context)) return false
  const hasGitTools = toolkits.some(
    (tk) => tk.toolkit === TOOLKITS.Git && (tk.tools?.length ?? 0) > 0
  )
  return hasGitTools && !context.some((c) => c.context_type === ContextType.CODE)
}

// Same warning badge as the premium-model marker, minus the state dot: the hint
// marks a missing configuration, not a live status.
export const GitDatasourceHint = () => (
  <StatusBadge status={StatusEnum.Warning} text="Git datasource required" showDot={false} />
)
