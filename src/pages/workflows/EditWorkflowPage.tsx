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
import { appInfoStore } from '@/store/appInfo'
import { workflowsStore, ERROR_FORMAT_JSON } from '@/store/workflows'
import { WorkflowIssue } from '@/types/entity'
import { ConfigItem } from '@/types/entity/configuration'
import { WorkflowAIRefineResponse } from '@/types/entity/workflow'
import API from '@/utils/api'
import { canEdit } from '@/utils/entity'
import toaster from '@/utils/toaster'
import {
  processBackendError,
  WorkflowValidationError,
} from '@/utils/workflowEditor/helpers/backendErrorHandler'
import { isVisualEditorEnabled, notifyAboutConsumerSlots } from '@/utils/workflows'

import RefineWorkflowPromptPopup from './components/RefineWorkflowPromptPopup'
import WorkflowForm, { WorkflowFormRef } from './components/WorkflowForm'
import WorkflowsNavigation from './components/WorkflowsNavigation'
import WorkflowVersionHistoryPopup from './components/WorkflowVersionHistoryPopup'
import WorkflowVisualVersionHistoryPopup from './components/WorkflowVisualVersionHistoryPopup'
import WorkflowStartExecutionPopup from './details/popups/WorkflowStartExecutionPopup'
import EditWorkflowHeaderActions from './EditWorkflowHeaderActions'
import { useWorkflowHistoryRestore } from './useWorkflowHistoryRestore'

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

  const [workflowAIEnabled] = useWorkflowAIEnabled()

  const { currentWorkflow, currentWorkflowLoading, currentWorkflowError } =
    useSnapshot(workflowsStore)
  const { configs } = useSnapshot(appInfoStore)

  const visualEditorEnabled = isVisualEditorEnabled(configs as ConfigItem[])

  const applyWorkflowBackendValidationError = (parsedError: WorkflowValidationError) => {
    setIssues(null)
    const { issues: backendIssues, generalError } = processBackendError(parsedError)
    if (backendIssues) {
      setIssues(backendIssues)
      formRef.current?.openIssuesPanel()
    } else if (generalError) {
      toaster.error(generalError)
    } else {
      toaster.error('Validation returned no issue details')
    }
  }

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
    applyWorkflowBackendValidationError,
    onRestoreApplied: () => setPreRefinementYaml(null),
  })

  useEffect(() => {
    workflowsStore.fetchWorkflow(id)

    return () => {
      workflowsStore.clearCurrentWorkflow()
    }
  }, [id])

  useEffect(() => {
    if (currentWorkflowError) {
      toaster.error('Failed to load workflow data')
    }
  }, [currentWorkflowError])

  const submit = async (values: any, shouldOpenExecution = false) => {
    const errorFormat = visualEditorEnabled ? ERROR_FORMAT_JSON : undefined

    try {
      setIssues(null)
      formRef.current?.clearAllResolvedFields()

      const response = await workflowsStore.updateWorkflow(id, values, errorFormat)
      // Refinement is now the saved baseline — revert no longer makes sense
      setPreRefinementYaml(null)
      toaster.info('Workflow has been updated successfully!')

      // Slots whose integration is left to whoever runs the workflow do not block saving, but the
      // author should know they depend on each user's own setup.
      notifyAboutConsumerSlots(await response?.json().catch(() => undefined))

      if (shouldOpenExecution) {
        await workflowsStore.fetchWorkflow(id)
        setShowExecutionPopup(true)
      } else {
        goBackFromWorkflowEdit({ workflowId: id })
      }
    } catch (error: any) {
      if (errorFormat !== ERROR_FORMAT_JSON) {
        API.handleError({ error: error.parsedError })
        return
      }
      if (error?.parsedError) {
        applyWorkflowBackendValidationError(error.parsedError)
      } else {
        toaster.error('Failed to save the workflow')
      }
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
            visualEditorEnabled={visualEditorEnabled}
            hasPreRefinement={!!preRefinementYaml}
            isBusy={currentWorkflowLoading || !currentWorkflow}
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
            issues={issues}
            setIssues={setIssues}
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
        startHint={currentWorkflow?.start_hint}
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
