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

import { useEffect, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { ButtonType } from '@/constants'
import { useWorkflowAIEnabled } from '@/hooks/useFeatureFlags'
import { useVueRoute } from '@/hooks/useVueRouter'
import { goBackFromWorkflowEdit } from '@/pages/workflows/utils/goBackWorkflows'
import {
  clearOutcome,
  contractOutcomeStore,
  resetOutcome,
  takeHandedOverIssues,
} from '@/store/contractOutcome'
import { workflowsStore, ERROR_FORMAT_JSON } from '@/store/workflows'
import { WorkflowIssue } from '@/types/entity'
import { WorkflowAIRefineResponse } from '@/types/entity/workflow'
import { canEdit } from '@/utils/entity'
import toaster from '@/utils/toaster'
import {
  hasSaveWarnings,
  isSaveFinding,
  parseContractOutcome,
  ParsedContractOutcome,
} from '@/utils/workflowEditor/helpers/contractProtocol'
import { notifyAboutWarnings } from '@/utils/workflowWarnings'

import RefineWorkflowPromptPopup from './components/RefineWorkflowPromptPopup'
import WorkflowForm, { WorkflowFormRef, WorkflowSubmitOutcome } from './components/WorkflowForm'
import WorkflowsNavigation from './components/WorkflowsNavigation'
import WorkflowVersionHistoryPopup from './components/WorkflowVersionHistoryPopup'
import WorkflowVisualVersionHistoryPopup from './components/WorkflowVisualVersionHistoryPopup'
import WorkflowStartExecutionPopup from './details/popups/WorkflowStartExecutionPopup'
import { useContractCheck } from './editor/hooks/useContractCheck'
import { readJsonBody, useIssuesOutcome } from './editor/hooks/useIssuesOutcome'
import EditWorkflowHeaderActions from './EditWorkflowHeaderActions'
import { useWorkflowHistoryRestore } from './useWorkflowHistoryRestore'

const countWarnings = (issues: WorkflowIssue[]) => issues.filter(isSaveFinding).length

const UNREADABLE_SAVE_RESULT_MESSAGE =
  "Workflow saved, but its validation result couldn't be read. Run Check to review it."

/** `truncated` counts entries the backend cut off, whose severity is unknown. */
const warningsToast = (count: number, truncated = 0) => {
  if (count === 0) return 'Workflow saved, but some warnings could not be listed'
  const more = truncated > 0 ? ', and more are not listed' : ''
  return `Workflow saved with ${count} warning${count === 1 ? '' : 's'}${more}`
}

const EditWorkflowPage: React.FC = () => {
  const route = useVueRoute()
  const { id } = route.params as { id: string }
  const formRef = useRef<WorkflowFormRef>(null)
  const [showExecutionPopup, setShowExecutionPopup] = useState(false)
  const [issues, setIssues] = useState<WorkflowIssue[] | null>(null)
  const [showPromptPopup, setShowPromptPopup] = useState(false)
  const [showRevertConfirm, setShowRevertConfirm] = useState(false)
  const [capturedYaml, setCapturedYaml] = useState('')
  // non-null only while an unsaved AI refinement is active
  const [preRefinementYaml, setPreRefinementYaml] = useState<string | null>(null)

  // Saved with warnings (here or on the new page): the page stays open and the header offers Done.
  const [savedWithWarnings, setSavedWithWarnings] = useState(false)
  // Start hint of this page's last successful save. The store copy is refreshed after a warned save
  // without being awaited, and stays old if that refresh fails, so Run anyway reads this one.
  const [savedStartHint, setSavedStartHint] = useState<string | undefined>(undefined)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // The workflow this page currently shows; a save that outlives it must not touch anything.
  const activeIdRef = useRef<string | null>(null)
  const pendingOpenPanelRef = useRef(false)

  const [workflowAIEnabled] = useWorkflowAIEnabled()

  const { currentWorkflow, currentWorkflowLoading, currentWorkflowError } =
    useSnapshot(workflowsStore)
  const { beginSave, showIssues, showSaveFailure } = useIssuesOutcome({
    formRef,
    outcomeKey: id,
    setIssues,
  })

  const {
    showVersionHistory,
    showVisualVersionHistory,
    versionHistoryYaml,
    handleShowVersionHistory,
    handleShowVisualVersionHistory,
    handleRestoreFromHistory,
    hideYamlHistory,
    hideVisualHistory,
    disableCanvasShortcuts,
  } = useWorkflowHistoryRestore({
    workflowId: id,
    formRef,
    setIssues,
    onRestoreApplied: () => setPreRefinementYaml(null),
  })

  const { check, isChecking } = useContractCheck({
    formRef,
    workflowId: id,
    outcomeKey: id,
    setIssues,
  })

  useEffect(() => {
    workflowsStore.fetchWorkflow(id)

    return () => {
      workflowsStore.clearCurrentWorkflow()
    }
  }, [id])

  // Takes over the outcome handed over for this workflow (a create that came back with warnings);
  // an outcome for anything else is stale. Leaving clears the slot only when it is still ours.
  useEffect(() => {
    activeIdRef.current = id
    setSavedWithWarnings(false)
    setSavedStartHint(undefined)
    setIsDirty(false)
    setIsSaving(false)

    const handedOverIssues = takeHandedOverIssues(id)
    const { outcome } = contractOutcomeStore
    if (handedOverIssues && outcome?.key === id) {
      setIssues(handedOverIssues)
      pendingOpenPanelRef.current = true
      setSavedWithWarnings(true)
      const count = countWarnings(handedOverIssues)
      const truncated = outcome.truncated ?? 0
      if (count > 0 || truncated > 0) toaster.info(warningsToast(count, truncated))
    } else {
      resetOutcome()
    }

    return () => {
      activeIdRef.current = null
      pendingOpenPanelRef.current = false
      clearOutcome(id)
    }
  }, [id])

  // The form mounts once the workflow has loaded; the panel can only open after that.
  useEffect(() => {
    if (pendingOpenPanelRef.current && !currentWorkflowLoading && currentWorkflow) {
      pendingOpenPanelRef.current = false
      formRef.current?.openIssuesPanel()
    }
  }, [currentWorkflowLoading, currentWorkflow])

  useEffect(() => {
    if (currentWorkflowError) {
      clearOutcome(id)
      pendingOpenPanelRef.current = false
      toaster.error('Failed to load workflow data')
    }
  }, [currentWorkflowError])

  // "Run anyway" reads the start hint from the store, and the save may have changed it.
  const refreshHistory = () => {
    workflowsStore.refreshCurrentWorkflowHistory(id).catch((error) => {
      // The saved workflow is unaffected; the history and start hint refresh on the next load.
      console.error('Failed to refresh the workflow history after a save', error)
    })
  }

  const finishWarnedSave = (parsed: ParsedContractOutcome, warningCount: number) => {
    showIssues(parsed, 'saved')
    setSavedWithWarnings(true)
    toaster.info(warningsToast(warningCount, parsed.truncated))
    notifyAboutWarnings({ warnings: parsed.otherWarnings }, { prefixSaved: true })
    // Not awaited: the save is done, and a slow history read must not hold the form lock.
    refreshHistory()
  }

  const submit = async (
    values: any,
    shouldOpenExecution = false
  ): Promise<WorkflowSubmitOutcome> => {
    const submittedId = id
    // A response that outlives its page or its workflow is not shown: no navigation, no store writes.
    const isCurrent = () => activeIdRef.current === submittedId

    try {
      beginSave()
      // A save result replaces the previous one: the Saved header comes back only if this save warns.
      setSavedWithWarnings(false)

      const response = await workflowsStore.updateWorkflow(id, values, ERROR_FORMAT_JSON, true)
      // The save went through either way; an unreadable body only means its findings are unknown.
      const { readable, body } = await readJsonBody(response)
      const parsed = parseContractOutcome(body)
      if (!isCurrent()) return 'navigated'
      setSavedStartHint(values.start_hint ?? '')

      if (!readable) {
        // Navigating away would drop findings nobody saw. Check treats the same case as a failure.
        toaster.info(UNREADABLE_SAVE_RESULT_MESSAGE)
        refreshHistory()
        return 'stayed'
      }

      // Refinement is now the saved baseline — revert no longer makes sense
      setPreRefinementYaml(null)

      if (hasSaveWarnings(parsed)) {
        finishWarnedSave(parsed, countWarnings(parsed.issues))
        return 'stayed'
      }

      toaster.info('Workflow has been updated successfully!')

      // Slots whose integration is left to whoever runs the workflow do not block saving, but the
      // author should know they depend on each user's own setup.
      notifyAboutWarnings({ warnings: parsed.otherWarnings }, { prefixSaved: true })

      if (shouldOpenExecution) {
        await workflowsStore.fetchWorkflow(id)
        if (!isCurrent()) return 'navigated'
        setShowExecutionPopup(true)
        return 'stayed'
      }
      goBackFromWorkflowEdit({ workflowId: id })
      return 'navigated'
    } catch (error: any) {
      if (!isCurrent()) return 'navigated'
      showSaveFailure(error)
      return 'error'
    }
  }

  const saveWorkflow = async (shouldRun: boolean) => {
    if (!formRef.current) return
    const validation = formRef.current.validateWorkflow()
    if (!validation?.isValid) {
      formRef.current.triggerValidation()
      return
    }
    await formRef.current.save(shouldRun)
  }

  const onBack = () => {
    goBackFromWorkflowEdit({ workflowId: id })
  }

  const canWrite = currentWorkflow ? canEdit(currentWorkflow) : false

  const handleRefineStart = () => {
    setCapturedYaml(formRef.current?.getFormValues()?.yaml_config ?? '')
    setShowPromptPopup(true)
  }

  const handleRefined = (result: WorkflowAIRefineResponse) => {
    setPreRefinementYaml(capturedYaml)
    formRef.current?.replaceYamlConfig(result.yaml_config)
    toaster.info('AI refine applied — save to confirm')
  }

  const handleRevertConfirm = () => {
    if (!preRefinementYaml) return
    setShowRevertConfirm(false)
    formRef.current?.replaceYamlConfig(preRefinementYaml)
    setPreRefinementYaml(null)
    toaster.info('Reverted to previous version')
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Workflows" description="Browse and run available AI-powered workflows">
        <WorkflowsNavigation />
      </Sidebar>
      <PageLayout
        showBack
        limitWidth={false}
        isLoading={currentWorkflowLoading}
        title="Edit Workflow"
        onBack={onBack}
        childrenClassName="px-0"
        rightContent={
          <EditWorkflowHeaderActions
            workflowAIEnabled={workflowAIEnabled}
            hasPreRefinement={!!preRefinementYaml}
            isBusy={currentWorkflowLoading || !currentWorkflow}
            isChecking={isChecking}
            isSaving={isSaving}
            isSavedWithWarnings={savedWithWarnings && !isDirty}
            onRunAnyway={() => setShowExecutionPopup(true)}
            onRevert={() => setShowRevertConfirm(true)}
            onRefine={handleRefineStart}
            onBack={onBack}
            onSave={() => saveWorkflow(false)}
            onSaveAndRun={() => saveWorkflow(true)}
          />
        }
      >
        {currentWorkflowLoading && (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        )}

        {!currentWorkflowLoading && !currentWorkflow && (
          <div className="flex justify-center p-8">
            <p className="text-text-quaternary">Workflow not found</p>
          </div>
        )}

        {!currentWorkflowLoading && currentWorkflow && (
          <WorkflowForm
            ref={formRef}
            onSubmit={submit}
            onDirtyChange={setIsDirty}
            onSavingChange={setIsSaving}
            issues={issues}
            setIssues={setIssues}
            outcomeKey={id}
            onCheck={check}
            isChecking={isChecking}
            isCheckLocked={isSaving}
            workflow={currentWorkflow}
            isEditing
            onShowVersionHistory={handleShowVersionHistory}
            onShowVisualVersionHistory={handleShowVisualVersionHistory}
            disableCanvasShortcuts={disableCanvasShortcuts}
          />
        )}
      </PageLayout>

      <WorkflowVersionHistoryPopup
        visible={showVersionHistory}
        canWrite={canWrite}
        currentEditorYaml={versionHistoryYaml}
        history={currentWorkflow?.yaml_config_history ?? []}
        onHide={hideYamlHistory}
        onRestore={handleRestoreFromHistory}
      />

      <WorkflowVisualVersionHistoryPopup
        visible={showVisualVersionHistory}
        canWrite={canWrite}
        currentEditorYaml={versionHistoryYaml}
        history={currentWorkflow?.yaml_config_history ?? []}
        onHide={hideVisualHistory}
        onRestore={handleRestoreFromHistory}
      />

      <WorkflowStartExecutionPopup
        isVisible={showExecutionPopup}
        onHide={() => setShowExecutionPopup(false)}
        workflowId={id}
        startHint={savedStartHint ?? currentWorkflow?.start_hint}
      />

      <RefineWorkflowPromptPopup
        isVisible={showPromptPopup}
        workflowId={id}
        currentYaml={capturedYaml}
        onHide={() => setShowPromptPopup(false)}
        onRefined={handleRefined}
      />

      <ConfirmationModal
        visible={showRevertConfirm}
        header="Revert to Previous Version"
        message="This will discard the AI refinement and restore the previous version. Continue?"
        confirmText="Revert"
        confirmButtonType={ButtonType.DELETE}
        onConfirm={handleRevertConfirm}
        onCancel={() => setShowRevertConfirm(false)}
      />
    </div>
  )
}

export default EditWorkflowPage
