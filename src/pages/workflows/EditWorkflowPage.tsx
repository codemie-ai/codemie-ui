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

import RunSvg from '@/assets/icons/run-wf-small.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { WOKRFLOW_EXECUTIONS } from '@/constants/routes'
import { useVueRoute } from '@/hooks/useVueRouter'
import { goBackWorkflows } from '@/pages/workflows/utils/goBackWorkflows'
import { appInfoStore } from '@/store/appInfo'
import { workflowsStore, ERROR_FORMAT_JSON } from '@/store/workflows'
import { WorkflowIssue } from '@/types/entity'
import { ConfigItem } from '@/types/entity/configuration'
import API from '@/utils/api'
import toaster from '@/utils/toaster'
import { processBackendError } from '@/utils/workflowEditor/helpers/backendErrorHandler'
import { isVisualEditorEnabled } from '@/utils/workflows'

import WorkflowForm, { WorkflowFormRef } from './components/WorkflowForm'
import WorkflowsNavigation from './components/WorkflowsNavigation'
import WorkflowStartExecutionPopup from './executions/WorkflowStartExecutionPopup'

const EditWorkflowPage: React.FC = () => {
  const route = useVueRoute()
  const { id } = route.params as { id: string }
  const formRef = useRef<WorkflowFormRef>(null)
  const [showExecutionPopup, setShowExecutionPopup] = useState(false)
  const [issues, setIssues] = useState<WorkflowIssue[] | null>(null)

  const { currentWorkflow, currentWorkflowLoading, currentWorkflowError } =
    useSnapshot(workflowsStore)
  const { configs } = useSnapshot(appInfoStore)

  const visualEditorEnabled = isVisualEditorEnabled(configs as ConfigItem[])

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

      await workflowsStore.updateWorkflow(id, values, errorFormat)
      toaster.info('Workflow has been updated successfully!')

      if (shouldOpenExecution) {
        setShowExecutionPopup(true)
      } else {
        goBackWorkflows({ name: WOKRFLOW_EXECUTIONS, params: { id } })
      }
    } catch (error: any) {
      if (errorFormat !== ERROR_FORMAT_JSON) {
        API.handleError({ error: error.parsedError })
        return
      }

      const { issues: backendIssues, generalError } = processBackendError(error.parsedError)

      if (backendIssues) {
        setIssues(backendIssues)
        formRef.current?.openIssuesPanel()
      } else if (generalError) {
        toaster.error(generalError)
      }
    }
  }

  const handleSave = async () => {
    if (!formRef.current) return

    const validation = formRef.current.validateWorkflow()

    if (!validation?.isValid) {
      formRef.current.triggerValidation()
      return
    }

    await formRef.current.save(false)
  }

  const handleSaveAndRun = async () => {
    if (!formRef.current) return

    const validation = formRef.current.validateWorkflow()

    if (!validation?.isValid) {
      formRef.current.triggerValidation()
      return
    }

    await formRef.current.save(true)
  }

  const onBack = () => {
    goBackWorkflows({ name: WOKRFLOW_EXECUTIONS, params: { id } })
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
          <div className="flex gap-5">
            <Button type="secondary" className="min-w-20" onClick={onBack}>
              Cancel
            </Button>
            <Button
              className="min-w-20"
              onClick={handleSave}
              disabled={currentWorkflowLoading || !currentWorkflow}
            >
              Save
            </Button>
            {visualEditorEnabled && (
              <Button
                className="min-w-20"
                onClick={handleSaveAndRun}
                disabled={currentWorkflowLoading || !currentWorkflow}
              >
                <RunSvg />
                Save and Run
              </Button>
            )}
          </div>
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
          />
        )}
      </PageLayout>

      <WorkflowStartExecutionPopup
        isVisible={showExecutionPopup}
        onHide={() => setShowExecutionPopup(false)}
        workflowId={id}
      />
    </div>
  )
}

export default EditWorkflowPage
