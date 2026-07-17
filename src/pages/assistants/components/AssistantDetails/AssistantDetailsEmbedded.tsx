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

import DetailsSidebar from '@/components/details/DetailsSidebar'
import { Assistant } from '@/types/entity/assistant'

import AssistantDetailsMainSections from './components/AssistantDetailsMainSections'
import AssistantDetailsProfile from './components/AssistantDetailsProfile'
import AssistantDetailsSidebarSections from './components/AssistantDetailsSidebarSections'

interface AssistantDetailsEmbeddedProps {
  assistant: Assistant
  onNewIntegration?: (project: string, settingType: string, callback: () => void) => void
}

/**
 * Single-column assistant details view for embedding inside another page (e.g. the
 * workflow executions side panel). Composes the shared sections without any navigation
 * affordances: no actions bar and no clickable skills/datasources/sub-assistants, so
 * opening it never routes away from the host page (which would drop execution polling
 * and bypass unsaved-changes guards). The per-user "Your Integration Settings" section
 * stays fully interactive.
 */
const AssistantDetailsEmbedded = ({
  assistant,
  onNewIntegration,
}: AssistantDetailsEmbeddedProps) => {
  return (
    <div className="flex flex-col w-full">
      <AssistantDetailsProfile assistant={assistant} />

      <div className="mt-8 flex flex-col gap-9 z-10">
        <div className="flex flex-col gap-6 min-w-0">
          <AssistantDetailsMainSections assistant={assistant} onNewIntegration={onNewIntegration} />
        </div>

        <DetailsSidebar fullWidth>
          <AssistantDetailsSidebarSections assistant={assistant} />
        </DetailsSidebar>
      </div>
    </div>
  )
}

export default AssistantDetailsEmbedded
