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

import { forwardRef, useState } from 'react'

import CollapseSvg from '@/assets/icons/collapse.svg?react'
import CopySvg from '@/assets/icons/copy.svg?react'
import ExpandSvg from '@/assets/icons/expand.svg?react'
import Button from '@/components/Button'
import Textarea, { TextareaRef } from '@/components/form/Textarea'
import Popup from '@/components/Popup'
import { MAX_CONTENT_LENGTH, SKILL_INSTRUCTIONS_PLACEHOLDER } from '@/constants/skills'
import { copyToClipboard } from '@/utils/utils'

interface SkillInstructionsProps {
  value: string
  error?: string
  onChange: (value: string) => void
  onBlur?: () => void
}

const SkillInstructions = forwardRef<TextareaRef, SkillInstructionsProps>(
  ({ value, error, onChange, onBlur }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false)

    const handleExpand = () => setIsExpanded(true)
    const handleCollapse = () => setIsExpanded(false)

    const handleCopyClick = () => copyToClipboard(value, 'Instructions copied to clipboard')

    const charCount = value?.length ?? 0

    return (
      <>
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-end min-h-8 max-h-8 mb-4">
            <p className="text-sm font-semibold">
              Instructions ({charCount.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()})
            </p>
            <div className="ml-auto flex gap-4">
              <Button type="secondary" onClick={handleExpand}>
                <ExpandSvg /> Expand
              </Button>
            </div>
          </div>

          <Textarea
            ref={ref}
            rows={15}
            value={value}
            error={error}
            rootClass="h-full"
            className="resize-none min-h-full font-mono text-sm"
            placeholder={SKILL_INSTRUCTIONS_PLACEHOLDER}
            onBlur={onBlur}
            maxLength={MAX_CONTENT_LENGTH}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>

        <Popup
          hideFooter
          hideClose
          isFullWidth
          visible={isExpanded}
          onHide={handleCollapse}
          className="h-[90vh] pb-6"
          headerContent={
            <div className="flex items-center justify-between">
              <h4>Skill Instructions</h4>
              <div className="flex gap-4">
                <Button type="secondary" onClick={handleCopyClick} disabled={!value}>
                  <CopySvg />
                  Copy
                </Button>
                <Button type="secondary" onClick={handleCollapse}>
                  <CollapseSvg />
                  Collapse
                </Button>
              </div>
            </div>
          }
        >
          <div className="h-full pt-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-text-secondary">
                {charCount.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()} characters
              </p>
            </div>
            <Textarea
              rows={15}
              value={value}
              error={error}
              rootClass="h-full"
              className="resize-none min-h-full font-mono text-sm"
              placeholder={SKILL_INSTRUCTIONS_PLACEHOLDER}
              onBlur={onBlur}
              maxLength={MAX_CONTENT_LENGTH}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </Popup>
      </>
    )
  }
)

SkillInstructions.displayName = 'SkillInstructions'

export default SkillInstructions
