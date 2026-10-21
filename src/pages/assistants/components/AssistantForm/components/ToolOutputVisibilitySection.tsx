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

import Switch from '@/components/form/Switch'
import TooltipButton from '@/components/TooltipButton'

interface ToolOutputVisibilitySectionProps {
  value: boolean | null | undefined
  onChange: (value: boolean) => void
  onBlur: () => void
}

const HELPER_TEXT =
  "When enabled, end users see only the final assistant response. Tool calls, intermediate outputs, raw payloads, and execution traces stay hidden, and conversation settings can't turn them back on."

const ENABLED_NOTE =
  'This applies to everyone chatting with this assistant, including you. Turn it off to inspect tool execution while testing.'

const ToolOutputVisibilitySection: FC<ToolOutputVisibilitySectionProps> = ({
  value,
  onChange,
  onBlur,
}) => {
  const isHidden = Boolean(value)

  return (
    <div className="flex items-center gap-1">
      <Switch
        label="Hide tool outputs from end users"
        hint={HELPER_TEXT}
        value={isHidden}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
        labelClassName="text-sm"
      />
      {isHidden && <TooltipButton content={ENABLED_NOTE} />}
    </div>
  )
}

export default ToolOutputVisibilitySection
