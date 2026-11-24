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
import { isTokenCurrent, nextRequestToken } from '@/store/contractOutcome'
import { workflowsStore } from '@/store/workflows'
import { WorkflowIssue } from '@/types/entity'
import toaster from '@/utils/toaster'
import { parseContractOutcome } from '@/utils/workflowEditor/helpers/contractProtocol'
import { notifyAboutWarnings } from '@/utils/workflowWarnings'

import { CHECK_TIMEOUT_MS } from './editor/hooks/useContractCheck'
import { readJsonBody, useIssuesOutcome } from './editor/hooks/useIssuesOutcome'

const RESTORE_TIMEOUT_MESSAGE =
  'Validation of the restored workflow timed out. Run Check to review it.'
const UNREADABLE_RESTORE_RESULT_MESSAGE =
  "The restored workflow's validation result couldn't be read. Run Check to review it."

interface UseWorkflowHistoryRestoreArgs {
  workflowId: string
  formRef: RefObject<WorkflowFormRef | null>
  setIssues: Dispatch<SetStateAction<WorkflowIssue[] | null>>
  onRestoreApplied: () => void
}

export function useWorkflowHistoryRestore({
  workflowId,
  formRef,
  setIssues,
  onRestoreApplied,
}: UseWorkflowHistoryRestoreArgs) {
  const { showIssues, clearIssues, showRejection } = useIssuesOutcome({
    formRef,
    outcomeKey: workflowId,
    setIssues,
  })
  const abandonedTokensRef = useRef(new Set<number>())
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

  const isRestoreValidationCurrent = (token: number, yamlConfig: string) => {
    if (!isTokenCurrent(token) || !formRef.current) return false
    if (abandonedTokensRef.current.has(token)) return false
    if (formRef.current.getFormValues()?.yaml_config !== yamlConfig) {
      abandonedTokensRef.current.add(token)
      return false
    }
    return true
  }

  const watchYamlDivergence = (token: number, yamlConfig: string) => {
    const timer = window.setInterval(() => {
      if (formRef.current?.getFormValues()?.yaml_config !== yamlConfig) {
        abandonedTokensRef.current.add(token)
      }
    }, 10)
    return () => window.clearInterval(timer)
  }

  const validateRestoredWorkflow = async (yamlConfig: string) => {
    if (!formRef.current) return
    const token = nextRequestToken()
    const stopWatch = watchYamlDivergence(token, yamlConfig)
    // Same limit as Check: a validation that never answers must not leave the author waiting.
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
    try {
      const response = await workflowsStore.validateWorkflowConfig({
        id: workflowId,
        body: { ...formRef.current.getFormValues(), yaml_config: yamlConfig },
        signal: controller.signal,
      })
      const { readable, body } = await readJsonBody(response)
      const parsed = parseContractOutcome(body)
      // Other warnings describe the YAML that was just restored, so they are shown even when the
      // editor re-serialised it meanwhile; only the issues panel below needs the result to be current.
      notifyAboutWarnings({ warnings: parsed.otherWarnings })
      if (!isRestoreValidationCurrent(token, yamlConfig)) return
      // A body that stalls past the limit reads as unreadable; report it as the timeout it is.
      if (controller.signal.aborted) {
        toaster.error(RESTORE_TIMEOUT_MESSAGE)
        return
      }
      // An unreadable body is an unknown result, not a clean one.
      if (!readable) {
        toaster.error(UNREADABLE_RESTORE_RESULT_MESSAGE)
        return
      }
      if (parsed.issues.length > 0) {
        // The restored YAML is not saved yet, so the panel keeps the findings and stays open.
        showIssues(parsed, 'not-saved')
        return
      }
      clearIssues()
      toaster.success('No issues found in the restored workflow')
    } catch (error: any) {
      if (!isRestoreValidationCurrent(token, yamlConfig)) return
      if (controller.signal.aborted) {
        toaster.error(RESTORE_TIMEOUT_MESSAGE)
      } else if (error?.parsedError) {
        showRejection(error.parsedError, 'not-saved')
      } else {
        toaster.error('Failed to validate the restored workflow')
      }
    } finally {
      window.clearTimeout(timer)
      stopWatch()
    }
  }

  const handleRestoreFromHistory = async (yamlConfig: string) => {
    if (!formRef.current) return
    formRef.current?.replaceYamlConfig(yamlConfig)
    onRestoreApplied()
    setShowVersionHistory(false)
    setShowVisualVersionHistory(false)
    clearIssues()
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
