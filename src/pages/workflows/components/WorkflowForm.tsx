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

import {
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  Dispatch,
  SetStateAction,
} from 'react'
import { useSnapshot } from 'valtio'

import { FormIDs } from '@/constants/formIds'
import { YAML_PLACEHOLDER } from '@/constants/workflows'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import WorkflowNodeEditor, { WorkflowEditorRef } from '@/pages/workflows/editor/WorkflowEditor'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'
import { WorkflowIssue } from '@/types/entity'
import { ConfigItem } from '@/types/entity/configuration'
import { isVisualEditorEnabled } from '@/utils/workflows'

import WorkflowFormFields, { WorkflowFormFieldsRef } from './WorkflowFormFields'
import { baseWorkflowSchema } from './workflowSchema'
import { compareWorkflowData } from '../utils/compareWorkflowData'

interface WorkflowFormProps {
  onSubmit: (values: any, goBack?: boolean) => Promise<void>
  workflow?: any
  isEditing?: boolean
  onlyConfiguration?: boolean
  hideConfiguration?: boolean
  onValidityChange?: (isValid: boolean) => void
  issues?: WorkflowIssue[] | null
  setIssues?: Dispatch<SetStateAction<WorkflowIssue[] | null>>
}

const MODES = {
  SEQUENTIAL: 'Sequential',
}

export interface WorkflowFormRef {
  isValid: boolean
  validateWorkflow: () => { isValid: boolean; errors?: string[] }
  triggerValidation: () => void
  save: (shouldOpenExecution: boolean) => Promise<void>
  getFormValues: () => any
  openIssuesPanel: () => void
  clearAllResolvedFields: () => void
}

const DEFAULT_YAML_CONFIG = 'states: []'

const WorkflowForm = forwardRef<WorkflowFormRef, WorkflowFormProps>(
  (
    {
      onSubmit,
      workflow = {},
      isEditing = false,
      onlyConfiguration = false,
      hideConfiguration = false,
      onValidityChange,
      issues,
      setIssues,
    },
    ref
  ) => {
    const { configs } = useSnapshot(appInfoStore)
    const visualEditorEnabled = isVisualEditorEnabled(configs as ConfigItem[])

    const formFieldsRef = useRef<WorkflowFormFieldsRef>(null)
    const editorRef = useRef<WorkflowEditorRef>(null)
    const isInitializedRef = useRef(false)

    const [yamlConfig, setYamlConfig] = useState(workflow?.yaml_config ?? DEFAULT_YAML_CONFIG)
    const [workflowFields, setWorkflowFields] = useState({
      name: workflow?.name || '',
      description: workflow?.description || '',
      icon_url: workflow?.icon_url || '',
      shared: workflow?.shared ?? false,
      project: workflow?.project || null,
      guardrail_assignments: workflow.guardrail_assignments ?? [],
    })

    const formId = FormIDs.WORKFLOW_FORM

    const getCurrentValues = useCallback(() => {
      // For traditional form fields (when visual editor is disabled)
      if (!visualEditorEnabled) {
        if (!formFieldsRef.current) return null
        const formValues = formFieldsRef.current.getValues()
        return {
          yamlConfig: formValues?.yaml_config || DEFAULT_YAML_CONFIG,
          workflowFields: {
            name: formValues?.name || '',
            description: formValues?.description || '',
            icon_url: formValues?.icon_url || '',
            shared: formValues?.shared ?? false,
            project: formValues?.project || null,
            guardrail_assignments: formValues?.guardrail_assignments ?? [],
          },
        }
      }

      // For visual editor (initialize defaults on first load for new workflows)
      if (!isEditing && !isInitializedRef.current) {
        isInitializedRef.current = true
        return {
          yamlConfig: DEFAULT_YAML_CONFIG,
          workflowFields: {
            name: '',
            description: '',
            icon_url: '',
            shared: false,
            project: workflowFields.project,
            guardrail_assignments: [],
          },
        }
      }

      // For visual editor (return current state)
      return {
        yamlConfig,
        workflowFields,
      }
    }, [yamlConfig, workflowFields, visualEditorEnabled, isEditing])

    const { unblockTransition, blockTransition } = useUnsavedChanges({
      formId,
      getCurrentValues,
      comparator: compareWorkflowData,
    })

    const validateWorkflow = useCallback(() => {
      try {
        const values = visualEditorEnabled ? workflowFields : formFieldsRef.current?.getValues()
        baseWorkflowSchema.validateSync(values, { abortEarly: false })
        return { isValid: true }
      } catch (err: any) {
        const errors = err.errors || ['Validation failed']
        return {
          isValid: false,
          errors,
        }
      }
    }, [visualEditorEnabled, workflowFields])

    const triggerValidation = useCallback(async () => {
      if (visualEditorEnabled) {
        editorRef.current?.showWorkflowConfig()
        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })
        await editorRef.current?.triggerGeneralConfigValidation?.()
      } else if (formFieldsRef.current) {
        await formFieldsRef.current.triggerValidation()
      }
    }, [visualEditorEnabled])

    const getFormValues = useCallback(
      (newYamlConfig?, newWorkflowFields?) => {
        if (visualEditorEnabled) {
          return {
            ...(newWorkflowFields ?? workflowFields),
            yaml_config: newYamlConfig ?? yamlConfig,
            mode: MODES.SEQUENTIAL,
            yaml_config_history: workflow?.yaml_config_history || [],
          }
        }
        return formFieldsRef.current?.getValues()
      },
      [visualEditorEnabled, workflowFields, yamlConfig, workflow?.yaml_config_history]
    )

    const save = useCallback(
      async (shouldOpenExecution = false) => {
        let newYamlConfig = yamlConfig
        let newWorkflowFields = workflowFields

        if (visualEditorEnabled && editorRef.current) {
          const stateSaved = await editorRef.current.saveCurrentTab()
          if (!stateSaved) return

          newYamlConfig = editorRef.current.getYamlConfig()
          setYamlConfig(newYamlConfig)

          const savedFields = editorRef.current.getWorkflowFields()

          newWorkflowFields = { ...workflowFields, ...savedFields }
          setWorkflowFields(newWorkflowFields)
        }

        unblockTransition()
        const payload = getFormValues(newYamlConfig, newWorkflowFields)
        await onSubmit(payload, shouldOpenExecution)

        if (!shouldOpenExecution) {
          blockTransition()
        }
      },
      [
        visualEditorEnabled,
        yamlConfig,
        workflowFields,
        workflow?.yaml_config_history,
        getFormValues,
        onSubmit,
        unblockTransition,
        blockTransition,
      ]
    )

    useImperativeHandle(ref, () => ({
      isValid: formFieldsRef.current?.isValid ?? false,
      validateWorkflow,
      triggerValidation,
      save,
      getFormValues,
      openIssuesPanel: () => {
        editorRef.current?.openIssuesPanel()
      },
      clearAllResolvedFields: () => {
        editorRef.current?.clearAllResolvedFields()
      },
    }))

    const handleLoadExample = () => {
      setYamlConfig(YAML_PLACEHOLDER)
    }

    const handleNodeEditorConfigurationUpdate = (newYamlConfig: string) => {
      setYamlConfig(newYamlConfig)
    }

    const handleWorkflowUpdate = (values: any) => {
      setWorkflowFields((prev) => ({ ...prev, ...values }))
    }

    const showVisualEditor = !hideConfiguration && visualEditorEnabled

    const mergedWorkflow = {
      ...workflow,
      ...workflowFields,
    }

    const shouldShowLoadExample =
      !isEditing && (!workflow?.yaml_config || workflow?.yaml_config === DEFAULT_YAML_CONFIG)

    useEffect(() => {
      const loadDefaultProject = async () => {
        if (!workflowFields.project) {
          const defaultProject = await userStore.getDefaultProject()
          setWorkflowFields((prev) => ({ ...prev, project: defaultProject }))
        }
      }

      loadDefaultProject()
    }, [])

    return (
      <>
        {showVisualEditor ? (
          <WorkflowNodeEditor
            ref={editorRef}
            workflow={mergedWorkflow}
            yamlConfig={yamlConfig}
            onConfigurationUpdate={handleNodeEditorConfigurationUpdate}
            onWorkflowUpdate={handleWorkflowUpdate}
            isFullscreen={true}
            onLoadExample={shouldShowLoadExample ? handleLoadExample : undefined}
            issues={issues}
            setIssues={setIssues}
          />
        ) : (
          <WorkflowFormFields
            ref={formFieldsRef}
            onlyConfiguration={onlyConfiguration}
            hideConfiguration={hideConfiguration}
            workflow={workflow}
            isEditing={isEditing}
            mode={MODES.SEQUENTIAL}
            onSubmit={onSubmit}
            onValidityChange={onValidityChange}
          />
        )}
      </>
    )
  }
)

WorkflowForm.displayName = 'WorkflowForm'

export default WorkflowForm
