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

import { Dispatch, RefObject, SetStateAction, useRef, useState } from 'react'

import { WorkflowFormRef } from '@/pages/workflows/components/WorkflowForm'
import { workflowsStore, ERROR_FORMAT_JSON } from '@/store/workflows'
import { WorkflowIssue } from '@/types/entity'
import toaster from '@/utils/toaster'
import { WorkflowValidationError } from '@/utils/workflowEditor/helpers/backendErrorHandler'

interface UseWorkflowHistoryRestoreArgs {
  workflowId: string
  formRef: RefObject<WorkflowFormRef | null>
  setIssues: Dispatch<SetStateAction<WorkflowIssue[] | null>>
  applyWorkflowBackendValidationError: (parsedError: WorkflowValidationError) => void
  onRestoreApplied: () => void
}

export function useWorkflowHistoryRestore({
  workflowId,
  formRef,
  setIssues,
  applyWorkflowBackendValidationError,
  onRestoreApplied,
}: UseWorkflowHistoryRestoreArgs) {
  const validateGenRef = useRef(0)
  const abandonedGensRef = useRef(new Set<number>())
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showVisualVersionHistory, setShowVisualVersionHistory] = useState(false)
  const [versionHistoryYaml, setVersionHistoryYaml] = useState('')

  const editorYaml = () => formRef.current?.getFormValues()?.yaml_config ?? ''

  const handleShowVersionHistory = (visibleYaml?: string) => {
    setVersionHistoryYaml(visibleYaml ?? editorYaml())
    setShowVersionHistory(true)
  }

  const handleShowVisualVersionHistory = (visibleYaml: string) => {
    setVersionHistoryYaml(visibleYaml)
    setShowVisualVersionHistory(true)
  }

  const isRestoreValidationCurrent = (myGen: number, yamlConfig: string) => {
    if (validateGenRef.current !== myGen || !formRef.current) return false
    if (abandonedGensRef.current.has(myGen)) return false
    if (formRef.current.getFormValues()?.yaml_config !== yamlConfig) {
      abandonedGensRef.current.add(myGen)
      return false
    }
    return true
  }

  const watchYamlDivergence = (myGen: number, yamlConfig: string) => {
    const timer = window.setInterval(() => {
      if (formRef.current?.getFormValues()?.yaml_config !== yamlConfig) {
        abandonedGensRef.current.add(myGen)
      }
    }, 10)
    return () => window.clearInterval(timer)
  }

  const validateRestoredWorkflow = async (yamlConfig: string) => {
    if (!formRef.current) return
    validateGenRef.current += 1
    const myGen = validateGenRef.current
    const stopWatch = watchYamlDivergence(myGen, yamlConfig)
    try {
      await workflowsStore.validateWorkflow(
        workflowId,
        { ...formRef.current.getFormValues(), yaml_config: yamlConfig },
        ERROR_FORMAT_JSON
      )
      if (!isRestoreValidationCurrent(myGen, yamlConfig)) return
      setIssues(null)
      formRef.current?.clearAllResolvedFields()
      formRef.current?.closeIssuesPanel()
    } catch (error: any) {
      if (!isRestoreValidationCurrent(myGen, yamlConfig)) return
      if (error?.parsedError) {
        applyWorkflowBackendValidationError(error.parsedError)
      } else {
        toaster.error('Failed to validate the restored workflow')
      }
    } finally {
      stopWatch()
    }
  }

  const handleRestoreFromHistory = async (yamlConfig: string) => {
    if (!formRef.current) return
    formRef.current?.replaceYamlConfig(yamlConfig)
    onRestoreApplied()
    setShowVersionHistory(false)
    setShowVisualVersionHistory(false)
    setIssues(null)
    formRef.current?.clearAllResolvedFields()
    formRef.current?.closeIssuesPanel()
    toaster.info('Workflow YAML restored — checking for issues…')
    await validateRestoredWorkflow(yamlConfig)
  }

  return {
    showVersionHistory,
    showVisualVersionHistory,
    versionHistoryYaml,
    handleShowVersionHistory,
    handleShowVisualVersionHistory,
    handleRestoreFromHistory,
    hideYamlHistory: () => setShowVersionHistory(false),
    hideVisualHistory: () => setShowVisualVersionHistory(false),
    disableCanvasShortcuts: showVersionHistory || showVisualVersionHistory,
  }
}
