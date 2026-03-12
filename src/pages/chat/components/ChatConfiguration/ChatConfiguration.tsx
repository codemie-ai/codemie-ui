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

import { FC } from 'react'

import { cn } from '@/utils/utils'

import ChatConfigAssistantForm from './ChatConfigAssistants/ChatConfigAssistantForm'
import ChatConfigAssistants from './ChatConfigAssistants/ChatConfigAssistants'
import ChatConfigLlmSelector from './ChatConfigLlmSelector'
import ChatConfigSkillsSelector from './ChatConfigSkillsSelector'
import { useChatContext } from '../../hooks/useChatContext'

interface ChatConfigurationProps {
  showNewIntegrationPopup: (project: string, credentialType: string) => void
}

const ChatConfiguration: FC<ChatConfigurationProps> = ({ showNewIntegrationPopup }) => {
  const { isConfigVisible, isConfigFormVisible } = useChatContext()

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 h-full overflow-x-hidden bg-surface-base-sidebar shadow-surface-base-sidebar border-l border-border-specific-panel-outline transition-all duration-150 ease-in-out',
        isConfigVisible ? 'w-96 max-w-96' : 'w-0'
      )}
    >
      {isConfigVisible && (
        <div className="flex flex-col w-96 pl-2 pr-2 h-full">
          {isConfigFormVisible ? (
            <ChatConfigAssistantForm showNewIntegrationPopup={showNewIntegrationPopup} />
          ) : (
            <div className="py-7 px-4 overflow-y-auto">
              <h3 className="font-semibold mb-3">General</h3>
              <ChatConfigLlmSelector />
              <ChatConfigSkillsSelector />
              <ChatConfigAssistants />
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export default ChatConfiguration
