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

import ToolCallPolicyDropdown, {
  ToolCallPolicy,
  ToolCallPolicyDropdownVariant,
} from '@/components/ToolCallPolicyDropdown/ToolCallPolicyDropdown'

import { TOOL_CALL_POLICY_LABELS } from './constants'

interface ChatPromptToolCallPolicyProps {
  policy: ToolCallPolicy
  disabled?: boolean
  onChange: (policy: ToolCallPolicy) => void
}

const ChatPromptToolCallPolicy: FC<ChatPromptToolCallPolicyProps> = ({
  policy,
  disabled = false,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-3 ml-2">
      <span className="text-xs text-text-tertiary">{TOOL_CALL_POLICY_LABELS.PREFIX}</span>
      <ToolCallPolicyDropdown
        value={policy}
        onChange={onChange}
        disabled={disabled}
        variant={ToolCallPolicyDropdownVariant.TOOLBAR}
      />
    </div>
  )
}

export default ChatPromptToolCallPolicy
