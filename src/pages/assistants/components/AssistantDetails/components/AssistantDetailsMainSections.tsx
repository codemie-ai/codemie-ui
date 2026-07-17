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

import { useState } from 'react'

import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import { Assistant } from '@/types/entity/assistant'
import { isUserMappingSupported } from '@/utils/assistants'

import AssistantPromptVariables from './AssistantPromptVariables'
import ConversationStarters from './ConversationStarters'
import SystemInstructions from './SystemInstructions'
import { UserMapping } from './UserMapping/UserMapping'

interface AssistantDetailsMainSectionsProps {
  assistant: Assistant
  isTemplate?: boolean
  onNewIntegration?: (project: string, settingType: string, callback: () => void) => void
}

/**
 * Main-column content of the assistant details view: about, conversation starters,
 * system instructions, prompt variables and the per-user "Your Integration Settings"
 * mapping. Shared between the full details page (AssistantDetails) and the embedded
 * side-panel view (AssistantDetailsEmbedded).
 */
const AssistantDetailsMainSections = ({
  assistant,
  isTemplate,
  onNewIntegration,
}: AssistantDetailsMainSectionsProps) => {
  const [showUserMappingSection, setShowUserMappingSection] = useState(false)

  // Global (marketplace) assistants support the full per-user mapping. Other shared assistants
  // support it too, but only for their non-pinned MCP servers (matches the backend gate: shared
  // assistants receive per-user mappings only for MCP toolkit types).
  const userMappingIsSupported =
    !!onNewIntegration && !isTemplate && isUserMappingSupported(assistant)

  return (
    <>
      <div>
        {userMappingIsSupported && showUserMappingSection && (
          <InfoWarning
            className="mb-6"
            type={InfoWarningType.INFO}
            message='You can select your own integrations in the "Your Integration Settings" section below to personalize how this assistant interacts with tools and services.'
            header={
              assistant.is_global
                ? 'This is a marketplace assistant with customizable integrations.'
                : 'This assistant supports customizable integrations.'
            }
          />
        )}
        <h5 className="font-bold text-sm">About Assistant:</h5>
        <p className="mt-2.5 text-sm text-text-quaternary break-words whitespace-pre-wrap">
          {assistant.description}
        </p>
      </div>
      <ConversationStarters items={assistant.conversation_starters} />
      <SystemInstructions text={assistant.system_prompt} />

      {!!assistant.prompt_variables?.length && (
        <AssistantPromptVariables
          promptVariables={assistant.prompt_variables}
          assistantID={assistant.id}
        />
      )}

      {userMappingIsSupported && (
        <UserMapping
          assistant={assistant}
          onNewIntegrationRequest={onNewIntegration}
          onSectionVisibilityChange={setShowUserMappingSection}
        />
      )}
    </>
  )
}

export default AssistantDetailsMainSections
