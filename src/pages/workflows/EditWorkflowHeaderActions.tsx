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
import CheckSvg from '@/assets/icons/check.svg?react'
import RunSvg from '@/assets/icons/run-wf-small.svg?react'
import Button from '@/components/Button'

interface EditWorkflowHeaderActionsProps {
  workflowAIEnabled: boolean
  hasPreRefinement: boolean
  isBusy: boolean
  /** A Check is in flight: Save is held back until it ends. */
  isChecking?: boolean
  /** A save is in flight: Save and Save and Run stay disabled until its outcome is known. */
  isSaving?: boolean
  /** Saved with warnings and unchanged since: Done, a disabled Saved and Run anyway replace the save buttons. */
  isSavedWithWarnings?: boolean
  onRunAnyway?: () => void
  onRevert: () => void
  onRefine: () => void
  onBack: () => void
  onSave: () => void
  onSaveAndRun: () => void
}

const EditWorkflowHeaderActions: React.FC<EditWorkflowHeaderActionsProps> = ({
  workflowAIEnabled,
  hasPreRefinement,
  isBusy,
  isChecking = false,
  isSaving = false,
  isSavedWithWarnings = false,
  onRunAnyway,
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
    {isSavedWithWarnings ? (
      <>
        <Button type="secondary" className="min-w-20" onClick={onBack}>
          Done
        </Button>
        <Button className="min-w-20" disabled>
          <CheckSvg aria-hidden="true" />
          Saved
        </Button>
        <Button className="min-w-20" onClick={onRunAnyway} disabled={isBusy}>
          <RunSvg />
          Run anyway
        </Button>
      </>
    ) : (
      <>
        <Button type="secondary" className="min-w-20" onClick={onBack}>
          Cancel
        </Button>
        <Button className="min-w-20" onClick={onSave} disabled={isBusy || isChecking || isSaving}>
          Save
        </Button>
        <Button
          className="min-w-20"
          onClick={onSaveAndRun}
          disabled={isBusy || isChecking || isSaving}
        >
          <RunSvg />
          Save and Run
        </Button>
      </>
    )}
  </div>
)

export default EditWorkflowHeaderActions
