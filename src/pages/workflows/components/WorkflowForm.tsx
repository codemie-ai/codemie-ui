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
import { filesStore } from '@/store/files'
import { settingsStore } from '@/store/settings'
import { userStore } from '@/store/user'
import { WorkflowIssue } from '@/types/entity'
import { ConfigItem } from '@/types/entity/configuration'
import { Setting } from '@/types/entity/setting'
import toaster from '@/utils/toaster'
import { hasUserIntegrationInYamlConfig, isVisualEditorEnabled } from '@/utils/workflows'

import WorkflowFormFields, { WorkflowFormFieldsRef } from './WorkflowFormFields'
import { baseWorkflowSchema } from './workflowSchema'
import { compareWorkflowData } from '../utils/compareWorkflowData'

/**
 * What happened to the page after a save:
 * - 'navigated': saved and the page is leaving
 * - 'stayed': saved and the user stays on the page (the form rebaselines to the sent payload)
 * - 'error': not saved
 * A submit that resolves with nothing keeps the pre-outcome behaviour.
 */
export type WorkflowSubmitOutcome = 'navigated' | 'stayed' | 'error'

interface WorkflowFormProps {
  onSubmit: (
    values: any,
    shouldOpenExecution?: boolean
  ) => Promise<WorkflowSubmitOutcome | void | undefined>
  onDirtyChange?: (dirty: boolean) => void
  onSavingChange?: (isSaving: boolean) => void
  workflow?: any
  isEditing?: boolean
  onlyConfiguration?: boolean
  hideConfiguration?: boolean
  onValidityChange?: (isValid: boolean) => void
  issues?: WorkflowIssue[] | null
  setIssues?: Dispatch<SetStateAction<WorkflowIssue[] | null>>
  /** Workflow id on the edit page, 'new' on the new page; scopes the contract outcome shown. */
  outcomeKey?: string
  onCheck?: () => void
  isChecking?: boolean
  /** Check is unavailable while a save is in flight or after a create. */
  isCheckLocked?: boolean
  onShowVersionHistory?: (visibleYaml: string) => void
  onShowVisualVersionHistory?: (visibleYaml: string) => void
  disableCanvasShortcuts?: boolean
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
  /** Payload a save would send (current tab saved first); null when the open panel is invalid. */
  getSubmitValues: () => Promise<any>
  openIssuesPanel: () => void
  closeIssuesPanel: () => void
  clearAllResolvedFields: () => void
  replaceYamlConfig: (yaml: string) => void
  /** True when the form or the open panel holds edits that differ from the last saved baseline. */
  hasUnsavedChanges: () => boolean
}

const DEFAULT_YAML_CONFIG = 'states: []'

/** Shape the dirty check compares, built from the legacy (YAML text) form values. */
const toLegacySnapshot = (formValues: any) => ({
  yamlConfig: formValues?.yaml_config || DEFAULT_YAML_CONFIG,
  workflowFields: {
    name: formValues?.name || '',
    description: formValues?.description || '',
    start_hint: formValues?.start_hint || '',
    icon_url: formValues?.icon_url || '',
    shared: formValues?.shared ?? false,
    project: formValues?.project || null,
    guardrail_assignments: formValues?.guardrail_assignments ?? [],
    categories: formValues?.categories ?? [],
  },
})

const WorkflowForm = forwardRef<WorkflowFormRef, WorkflowFormProps>(
  (
    {
      onSubmit,
      onDirtyChange,
      onSavingChange,
      workflow = {},
      isEditing = false,
      onlyConfiguration = false,
      hideConfiguration = false,
      onValidityChange,
      issues,
      setIssues,
      outcomeKey,
      onCheck,
      isChecking,
      isCheckLocked,
      onShowVersionHistory,
      onShowVisualVersionHistory,
      disableCanvasShortcuts,
    },
    ref
  ) => {
    const { configs } = useSnapshot(appInfoStore)
    const { settings, indexSettings } = useSnapshot(settingsStore)
    const visualEditorEnabled = isVisualEditorEnabled(configs as ConfigItem[])
    const isUsingVisualEditor = visualEditorEnabled && !hideConfiguration

    const formFieldsRef = useRef<WorkflowFormFieldsRef>(null)
    const editorRef = useRef<WorkflowEditorRef>(null)
    const isInitializedRef = useRef(false)

    const [yamlConfig, setYamlConfig] = useState(workflow?.yaml_config ?? DEFAULT_YAML_CONFIG)
    const [workflowFields, setWorkflowFields] = useState({
      name: workflow?.name || '',
      description: workflow?.description || '',
      start_hint: workflow?.start_hint || '',
      icon_url: workflow?.icon_url || '',
      shared: workflow?.shared ?? false,
      project: workflow?.project || null,
      guardrail_assignments: workflow.guardrail_assignments ?? [],
      categories: workflow?.categories ?? [],
    })

    useEffect(() => {
      if (Object.keys(settings).length === 0) {
        indexSettings()
      }
    }, [])

    useEffect(() => {
      if (hasUserIntegrationInYamlConfig(yamlConfig, settings as Record<string, Setting[]>)) {
        setWorkflowFields((prev) => ({ ...prev, shared: false }))
      }
    }, [yamlConfig, settings])

    const formId = FormIDs.WORKFLOW_FORM

    const getCurrentValues = useCallback(() => {
      if (!isUsingVisualEditor) {
        if (!formFieldsRef.current) return null
        return toLegacySnapshot(formFieldsRef.current.getValues())
      }

      // For visual editor (initialize defaults on first load for new workflows)
      if (!isEditing && !isInitializedRef.current) {
        isInitializedRef.current = true
        return {
          yamlConfig: DEFAULT_YAML_CONFIG,
          workflowFields: {
            name: '',
            description: '',
            start_hint: '',
            icon_url: '',
            shared: false,
            project: workflowFields.project,
            guardrail_assignments: [],
            categories: [],
          },
        }
      }

      // For visual editor (return current state)
      return {
        yamlConfig,
        workflowFields,
      }
    }, [yamlConfig, workflowFields, isUsingVisualEditor, isEditing])

    const { unblockTransition, blockTransition, resetBaseline, checkDirty } = useUnsavedChanges({
      formId,
      getCurrentValues,
      comparator: compareWorkflowData,
    })

    const lastDirtyRef = useRef<boolean | null>(null)
    // Result of the full workflow comparison (it can parse and compare the whole YAML), refreshed
    // only when the draft or the baseline changes, not on every poll tick.
    const workflowDirtyRef = useRef(false)

    const reportDirty = useCallback(() => {
      if (!onDirtyChange) return
      // Edits inside an open node, edge, YAML or settings panel reach the form state only once the
      // panel applies them, so the open panel is asked directly.
      const dirty = workflowDirtyRef.current || (editorRef.current?.isPanelDirty?.() ?? false)
      if (lastDirtyRef.current === dirty) return
      lastDirtyRef.current = dirty
      onDirtyChange(dirty)
    }, [onDirtyChange])

    // Compares the workflow whenever the checked values or the baseline change. In the legacy YAML
    // form the live values sit in react-hook-form, so this fires on baseline changes only.
    useEffect(() => {
      workflowDirtyRef.current = onDirtyChange ? checkDirty() : false
      reportDirty()
    }, [checkDirty, reportDirty, onDirtyChange])

    // Panel forms keep their edits in their own state and push nothing, so the open panel is asked
    // again after every edit inside the editor, once React has applied it.
    const reportDirtyAfterEdit = useCallback(() => {
      window.setTimeout(reportDirty, 0)
    }, [reportDirty])
    const editHandlers =
      onDirtyChange && isUsingVisualEditor
        ? {
            onInputCapture: reportDirtyAfterEdit,
            onChangeCapture: reportDirtyAfterEdit,
            onClickCapture: reportDirtyAfterEdit,
            onKeyUpCapture: reportDirtyAfterEdit,
          }
        : {}

    const validateWorkflow = useCallback(() => {
      try {
        const values = isUsingVisualEditor ? workflowFields : formFieldsRef.current?.getValues()
        baseWorkflowSchema.validateSync(values, { abortEarly: false })
        return { isValid: true }
      } catch (err: any) {
        const errors = err.errors || ['Validation failed']
        return {
          isValid: false,
          errors,
        }
      }
    }, [isUsingVisualEditor, workflowFields])

    const triggerValidation = useCallback(async () => {
      if (isUsingVisualEditor) {
        editorRef.current?.showWorkflowConfig()
        await new Promise((resolve) => {
          setTimeout(resolve, 100)
        })
        await editorRef.current?.triggerGeneralConfigValidation?.()
      } else if (formFieldsRef.current) {
        await formFieldsRef.current.triggerValidation()
      }
    }, [isUsingVisualEditor])

    const getFormValues = useCallback(
      (newYamlConfig?, newWorkflowFields?) => {
        if (isUsingVisualEditor) {
          return {
            ...(newWorkflowFields ?? workflowFields),
            yaml_config: newYamlConfig ?? yamlConfig,
            mode: MODES.SEQUENTIAL,
            yaml_config_history: workflow?.yaml_config_history || [],
          }
        }
        return formFieldsRef.current?.getValues()
      },
      [isUsingVisualEditor, workflowFields, yamlConfig, workflow?.yaml_config_history]
    )

    // Saves the open tab and collects what a save would send, plus the matching baseline snapshot.
    const collectSubmitValues = useCallback(async () => {
      let newYamlConfig = yamlConfig
      let newWorkflowFields = workflowFields

      if (visualEditorEnabled && editorRef.current) {
        const stateSaved = await editorRef.current.saveCurrentTab()
        if (!stateSaved) return null

        newYamlConfig = editorRef.current.getYamlConfig()
        setYamlConfig(newYamlConfig)

        const savedFields = editorRef.current.getWorkflowFields()

        newWorkflowFields = { ...workflowFields, ...savedFields }
        setWorkflowFields(newWorkflowFields)
      }

      const payload = getFormValues(newYamlConfig, newWorkflowFields)
      const snapshot = isUsingVisualEditor
        ? { yamlConfig: newYamlConfig, workflowFields: newWorkflowFields }
        : toLegacySnapshot(payload)

      return { payload, snapshot }
    }, [visualEditorEnabled, isUsingVisualEditor, yamlConfig, workflowFields, getFormValues])

    const getSubmitValues = useCallback(async () => {
      const collected = await collectSubmitValues()
      return collected ? collected.payload : null
    }, [collectSubmitValues])

    const updateSaving = useCallback(
      (value: boolean) => {
        onSavingChange?.(value)
      },
      [onSavingChange]
    )

    const save = useCallback(
      async (shouldOpenExecution = false) => {
        if (filesStore.pendingIconUploads > 0) {
          toaster.error('Wait for the icon upload to finish before saving.')
          return
        }
        const collected = await collectSubmitValues()
        if (!collected) return

        unblockTransition()
        updateSaving(true)

        let outcome: WorkflowSubmitOutcome | void | undefined
        try {
          outcome = await onSubmit(collected.payload, shouldOpenExecution)
        } catch (error) {
          blockTransition()
          throw error
        } finally {
          updateSaving(false)
        }

        if (outcome === 'stayed') {
          // Rebaseline to what was sent, not to the live values: edits made while the request was
          // in flight must stay dirty.
          resetBaseline(collected.snapshot)
          blockTransition()
        } else if (outcome === 'error' || outcome === 'navigated' || !shouldOpenExecution) {
          // The guard is shared by every form in the app: once this page is left it must be back on.
          blockTransition()
        }
      },
      [
        collectSubmitValues,
        onSubmit,
        unblockTransition,
        blockTransition,
        resetBaseline,
        updateSaving,
      ]
    )

    useImperativeHandle(ref, () => ({
      isValid: formFieldsRef.current?.isValid ?? false,
      validateWorkflow,
      triggerValidation,
      save,
      getFormValues,
      getSubmitValues,
      openIssuesPanel: () => {
        editorRef.current?.openIssuesPanel()
      },
      closeIssuesPanel: () => {
        editorRef.current?.closeIssuesPanel()
      },
      clearAllResolvedFields: () => {
        editorRef.current?.clearAllResolvedFields()
      },
      replaceYamlConfig: (yaml: string) => {
        setYamlConfig(yaml)
        if (!isUsingVisualEditor && formFieldsRef.current) {
          formFieldsRef.current.setYamlConfig(yaml)
        }
        blockTransition()
      },
      hasUnsavedChanges: () => checkDirty() || (editorRef.current?.isPanelDirty?.() ?? false),
    }))

    const handleLoadExample = () => {
      setYamlConfig(YAML_PLACEHOLDER)
    }

    // Stable on purpose: the editor rebuilds its manager, and resets the canvas, when this changes.
    const handleNodeEditorConfigurationUpdate = useCallback((newYamlConfig: string) => {
      setYamlConfig(newYamlConfig)
    }, [])

    const handleWorkflowUpdate = useCallback((values: any) => {
      setWorkflowFields((prev) => ({ ...prev, ...values }))
    }, [])

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
          <div className="contents" {...editHandlers}>
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
              outcomeKey={outcomeKey}
              onCheck={onCheck}
              isChecking={isChecking}
              isCheckLocked={isCheckLocked}
              onShowVersionHistory={onShowVersionHistory}
              onShowVisualVersionHistory={onShowVisualVersionHistory}
              disableCanvasShortcuts={disableCanvasShortcuts}
            />
          </div>
        ) : (
          <WorkflowFormFields
            ref={formFieldsRef}
            onlyConfiguration={onlyConfiguration}
            hideConfiguration={hideConfiguration}
            workflow={workflow}
            isEditing={isEditing}
            mode={MODES.SEQUENTIAL}
            onValidityChange={onValidityChange}
            onShowVersionHistory={onShowVersionHistory}
          />
        )}
      </>
    )
  }
)

WorkflowForm.displayName = 'WorkflowForm'

export default WorkflowForm
