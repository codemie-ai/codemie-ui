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

import React, { useMemo } from 'react'

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import TextDiffView from '@/components/TextDiffView'
import { ButtonType } from '@/constants'

interface SkillInstructionsDiffModalProps {
  visible: boolean
  currentContent: string
  suggestedContent: string
  onHide: () => void
  onApply: () => void
}

const SkillInstructionsDiffModal: React.FC<SkillInstructionsDiffModalProps> = ({
  visible,
  currentContent,
  suggestedContent,
  onHide,
  onApply,
}) => {
  const footerContent = useMemo(
    () => (
      <div className="flex items-center justify-end w-full gap-3">
        <Button variant={ButtonType.BASE} onClick={onHide}>
          Cancel
        </Button>
        <Button variant={ButtonType.PRIMARY} onClick={onApply}>
          Apply Suggestion
        </Button>
      </div>
    ),
    [onHide, onApply]
  )

  return (
    <Popup
      className="max-w-6xl w-full"
      overlayClassName="z-60"
      header="AI Refinement Analysis"
      visible={visible}
      onHide={onHide}
      withBorder
      footerContent={footerContent}
      bodyClassName="max-h-[calc(90vh-200px)] overflow-y-auto"
    >
      <div className="space-y-6">
        <div className="flex gap-2 mb-4 py-3 px-4 bg-surface-base-chat rounded-lg border border-border-structural">
          <AIGenerateSVG className="mt-0.5" />
          <div>
            <h5 className="text-xs font-bold text-text-primary mb-1">AI Refinement Complete</h5>
            <p className="text-xs text-text-secondary leading-relaxed">
              Review the changes below. Lines highlighted in{' '}
              <span className="text-failed-secondary font-semibold">red</span> will be removed,
              lines in <span className="text-success-primary font-semibold">green</span> will be
              added.
            </p>
          </div>
        </div>

        <TextDiffView
          oldText={currentContent}
          newText={suggestedContent}
          oldLabel="Current Instructions"
          newLabel="AI Suggestion"
        />
      </div>
    </Popup>
  )
}

export default SkillInstructionsDiffModal
