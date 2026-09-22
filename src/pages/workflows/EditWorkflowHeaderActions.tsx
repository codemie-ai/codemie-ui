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

import React from 'react'

import AIGenerateSVG from '@/assets/icons/ai-generate.svg?react'
import RunSvg from '@/assets/icons/run-wf-small.svg?react'
import Button from '@/components/Button'

interface EditWorkflowHeaderActionsProps {
  workflowAIEnabled: boolean
  visualEditorEnabled: boolean
  hasPreRefinement: boolean
  isBusy: boolean
  onRevert: () => void
  onRefine: () => void
  onBack: () => void
  onSave: () => void
  onSaveAndRun: () => void
}

const EditWorkflowHeaderActions: React.FC<EditWorkflowHeaderActionsProps> = ({
  workflowAIEnabled,
  visualEditorEnabled,
  hasPreRefinement,
  isBusy,
  onRevert,
  onRefine,
  onBack,
  onSave,
  onSaveAndRun,
}) => (
  <div className="flex gap-5">
    {workflowAIEnabled && hasPreRefinement && (
      <Button type="secondary" onClick={onRevert}>
        Revert to Previous
      </Button>
    )}
    {workflowAIEnabled && (
      <Button type="magical" onClick={onRefine} disabled={isBusy}>
        <AIGenerateSVG /> Refine with AI
      </Button>
    )}
    <Button type="secondary" className="min-w-20" onClick={onBack}>
      Cancel
    </Button>
    <Button className="min-w-20" onClick={onSave} disabled={isBusy}>
      Save
    </Button>
    {visualEditorEnabled && (
      <Button className="min-w-20" onClick={onSaveAndRun} disabled={isBusy}>
        <RunSvg />
        Save and Run
      </Button>
    )}
  </div>
)

export default EditWorkflowHeaderActions
