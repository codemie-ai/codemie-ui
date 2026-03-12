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

import React, { useState, useEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import PlusIcon from '@/assets/icons/plus.svg?react'
import RunSvg from '@/assets/icons/run-wf-small.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { WORKFLOWS_ALL, WORKFLOWS_MY } from '@/constants/routes'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { useVueRouter, useVueRoute } from '@/hooks/useVueRouter'
import { appInfoStore } from '@/store/appInfo'
import { workflowsStore, ERROR_FORMAT_JSON } from '@/store/workflows'
import { ConfigItem } from '@/types/entity/configuration'
import API from '@/utils/api'
import { preprocessYamlConfig } from '@/utils/helpers'
import toaster from '@/utils/toaster'
import { isVisualEditorEnabled } from '@/utils/workflows'

import WorkflowForm, { WorkflowFormRef } from './components/WorkflowForm'
import WorkflowsNavigation from './components/WorkflowsNavigation'
import WorkflowStartExecutionPopup from './executions/WorkflowStartExecutionPopup'
import { goBackWorkflows } from './utils/goBackWorkflows'

const DEFAULT_HEADLINE = 'Create Workflow'
const DEFAULT_SUBMIT = 'Save'
const CLONE_HEADLINE = 'Clone Workflow'
const CLONE_SUBMIT = 'Save'
const FROM_TEMPLATE_HEADLINE = 'Create Workflow from Template'
const FROM_TEMPLATE_ROUTE = 'new-workflow-from-template'

interface WorkflowTemplate {
  id?: string | null
  name?: string | null
  yaml_config?: string
  [key: string]: any
}

const NewWorkflowPage: React.FC = () => {
  const router = useVueRouter()
  const route = useVueRoute()
  const { id, slug } = route.params as { id?: string; slug?: string }
  const formRef = useRef<WorkflowFormRef>(null)

  const [isCloning] = useState(!!id)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
  const [showExecutionPopup, setShowExecutionPopup] = useState(false)
  const [createdWorkflowId, setCreatedWorkflowId] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<any>(null)

  const { configs } = useSnapshot(appInfoStore)

  const visualEditorEnabled = isVisualEditorEnabled(configs as ConfigItem[])

  const isFromTemplate =
    route.path.includes(FROM_TEMPLATE_ROUTE) || route.path.includes('from-template')

  const [headline, setHeadline] = useState(DEFAULT_HEADLINE)
  const [_submitName, setSubmitName] = useState(DEFAULT_SUBMIT)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isCloning && id) {
          setHeadline(CLONE_HEADLINE)
          setSubmitName(CLONE_SUBMIT)

          const data = await workflowsStore.getWorkflow(id)
          setTemplate({
            ...data,
            id: null,
            name: null,
          })
        } else if (isFromTemplate && slug) {
          setHeadline(FROM_TEMPLATE_HEADLINE)
          setSubmitName(DEFAULT_SUBMIT)

          const data = await workflowsStore.getWorkflowTemplateBySlug(slug)
          setTemplate({
            ...data,
            yaml_config: preprocessYamlConfig(data.yaml_config || ''),
            name: '',
          })
        } else {
          setTemplate({})
        }
      } catch {
        toaster.error('Failed to load workflow data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isCloning, isFromTemplate, id, slug])

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
    if (history.stack.length > 1) {
      goBackWorkflows()
    } else {
      router.push({ name: WORKFLOWS_ALL })
    }
  }

  const submit = async (values: any, shouldOpenExecution = false) => {
    setIsSubmitting(true)
    const errorFormat = visualEditorEnabled ? ERROR_FORMAT_JSON : undefined

    try {
      setValidationErrors(null) // Clear previous errors
      const response = await workflowsStore.createWorkflow(values, errorFormat)
      const workflow = await response.json()
      toaster.info('Workflow has been created successfully!')

      if (shouldOpenExecution) {
        setCreatedWorkflowId(workflow.data.id)
        setShowExecutionPopup(true)
        setIsSubmitting(false)
      } else if (isFromTemplate) {
        router.push({ name: WORKFLOWS_MY })
      } else {
        goBackWorkflows()
      }
    } catch (error: any) {
      if (errorFormat !== ERROR_FORMAT_JSON) {
        API.handleError({ error: error.parsedError })
        setIsSubmitting(false)
        return
      }

      setValidationErrors(error.parsedError)
    } finally {
      if (!shouldOpenExecution) setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Workflows" description="Browse and run available AI-powered workflows">
        <WorkflowsNavigation />
      </Sidebar>

      <PageLayout
        showBack
        limitWidth={false}
        isLoading={loading}
        title={headline}
        onBack={onBack}
        childrenClassName="px-0"
        rightContent={
          <div className="flex gap-5">
            <Button type="secondary" onClick={onBack}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <PlusIcon /> Save
            </Button>
            {visualEditorEnabled && (
              <Button onClick={handleSaveAndRun}>
                <RunSvg /> Save and Run
              </Button>
            )}
          </div>
        }
      >
        {!loading && (
          <WorkflowForm
            ref={formRef}
            onSubmit={submit}
            workflow={template}
            isEditing={false}
            validationErrors={validationErrors}
          />
        )}

        {isSubmitting && <Spinner />}
      </PageLayout>

      {createdWorkflowId && (
        <WorkflowStartExecutionPopup
          isVisible={showExecutionPopup}
          onHide={() => setShowExecutionPopup(false)}
          workflowId={createdWorkflowId}
        />
      )}
    </div>
  )
}

export default NewWorkflowPage
