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

import InputArray from '@/components/form/InputArray'

interface ConversationStartersFieldProps {
  value: string[]
  onChange: (value: string[]) => void
  error?: string
  isAIGenerated: boolean
  onMarkAsManual: () => void
  name?: string
}

const ConversationStartersField = ({
  value,
  onChange,
  error,
  isAIGenerated,
  onMarkAsManual,
  name,
}: ConversationStartersFieldProps) => (
  <InputArray
    className="mt-1.5"
    label="Conversation starters"
    hint="These will appear as suggestions to the user when they start a new chat with this assistant."
    maxLength={4}
    name={name}
    isAIGenerated={isAIGenerated}
    error={error}
    value={value}
    onChange={(newValue) => {
      onMarkAsManual()
      onChange(newValue)
    }}
  />
)

export default ConversationStartersField
