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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef, useContext, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UnsavedChangesContext, UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import WorkflowStartExecutionPopup from '@/pages/workflows/details/popups/WorkflowStartExecutionPopup'

import WorkflowForm, { WorkflowFormRef } from '../WorkflowForm'

const fieldValues = vi.hoisted(() => ({ current: { yaml_config: 'states: []' } as any }))
const visualMode = vi.hoisted(() => ({ enabled: false }))
const editor = vi.hoisted(() => ({
  props: null as any,
  saveCurrentTab: vi.fn(),
  yaml: 'states: []',
  fields: {} as Record<string, any>,
  panelDirty: false,
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: { configs: [] } }))
vi.mock('@/store/settings', () => ({
  settingsStore: { settings: {}, indexSettings: vi.fn() },
}))
vi.mock('@/store/user', () => ({
  userStore: { getDefaultProject: vi.fn().mockResolvedValue(null) },
}))
vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (s: any) => s }
})
vi.mock('@/utils/workflows', () => ({
  isVisualEditorEnabled: () => visualMode.enabled,
  hasUserIntegrationInYamlConfig: () => false,
}))
vi.mock('../WorkflowFormFields', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef((_props: any, ref: any) => {
      useImperativeHandle(ref, () => ({
        isValid: true,
        triggerValidation: vi.fn(),
        getValues: () => fieldValues.current,
        setYamlConfig: vi.fn(),
      }))
      return <div data-testid="form-fields" />
    }),
  }
})
vi.mock('@/pages/workflows/editor/WorkflowEditor', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef((props: any, ref: any) => {
      editor.props = props
      useImperativeHandle(ref, () => ({
        saveCurrentTab: editor.saveCurrentTab,
        isPanelDirty: () => editor.panelDirty,
        getYamlConfig: () => editor.yaml,
        getWorkflowFields: () => editor.fields,
        showWorkflowConfig: vi.fn(),
        openIssuesPanel: vi.fn(),
        closeIssuesPanel: vi.fn(),
        clearAllResolvedFields: vi.fn(),
      }))
      return <div data-testid="visual-editor" />
    }),
  }
})

// Popup dependencies
vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: { createWorkflowExecution: vi.fn() },
}))
vi.mock('@/components/Editor/Editor', () => ({ default: () => <textarea /> }))
vi.mock('@/hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    inputProps: {},
    addFiles: vi.fn(),
    removeFile: vi.fn(),
    openFilePicker: vi.fn(),
    hasActiveUploads: false,
  }),
  createFileMetadata: vi.fn(),
}))
vi.mock('@/components/Popup', () => ({
  default: ({ children, visible, onHide }: any) =>
    visible ? (
      <dialog open>
        <button onClick={onHide}>close</button>
        {children}
      </dialog>
    ) : null,
}))
vi.mock('@/components/File', () => ({ default: () => null }))
vi.mock('@/components/Spinner', () => ({ default: () => null }))
vi.mock('@/assets/icons/attachment.svg?react', () => ({ default: () => null }))
vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ name: 'edit-workflow', push: vi.fn(), replace: vi.fn() }),
}))

const workflow = {
  id: 'wf-1',
  name: 'Test',
  yaml_config: 'states: []',
  yaml_config_history: [],
  guardrail_assignments: [],
}

const baseValues = () => ({
  yaml_config: 'states: []',
  name: 'Test',
  description: '',
  start_hint: '',
  icon_url: '',
  shared: false,
  project: null,
  guardrail_assignments: [],
  categories: [],
})

// Lets the mount effects (default project load, baseline capture) finish.
const settle = () => act(async () => {})

let hasUnsaved: () => boolean
let navigatingAway: { current: boolean }

const Probe = () => {
  const ctx = useContext(UnsavedChangesContext)!
  hasUnsaved = ctx.checkHasUnsavedChanges
  navigatingAway = ctx.isNavigatingAwayRef
  return null
}

const mount = (
  props: Partial<React.ComponentProps<typeof WorkflowForm>> = {},
  withPopup = true
) => {
  const ref = createRef<WorkflowFormRef>()
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue('stayed')
  let triggerPopup: (v: boolean) => void = () => {}
  let triggerWorkflow: (w: any) => void = () => {}
  const Harness = () => {
    const [popup, setPopup] = useState(false)
    const [currentWorkflow, setCurrentWorkflow] = useState(props.workflow ?? workflow)
    triggerPopup = setPopup
    triggerWorkflow = setCurrentWorkflow
    return (
      <UnsavedChangesProvider>
        <Probe />
        <WorkflowForm
          ref={ref}
          isEditing
          {...props}
          workflow={currentWorkflow}
          onSubmit={onSubmit}
        />
        {withPopup && (
          <WorkflowStartExecutionPopup
            workflowId="wf-1"
            isVisible={popup}
            onHide={() => setPopup(false)}
          />
        )}
      </UnsavedChangesProvider>
    )
  }
  const utils = render(<Harness />)
  return {
    ref,
    onSubmit,
    setPopup: (v: boolean) => act(() => triggerPopup(v)),
    setWorkflow: (w: any) => act(() => triggerWorkflow(w)),
    ...utils,
  }
}

describe('WorkflowForm - run popup does not mask the dirty check (gate SR-005b)', () => {
  beforeEach(() => {
    fieldValues.current = baseValues()
  })

  it('control: a dirty form is detected without the popup mounted', async () => {
    mount({}, false)
    await settle()

    fieldValues.current = { ...baseValues(), description: 'edited' }

    expect(hasUnsaved()).toBe(true)
  })

  it('a dirty form still prompts after the run popup opens and closes', async () => {
    const { setPopup } = mount()
    await settle()

    fieldValues.current = { ...baseValues(), description: 'edited' }
    expect(hasUnsaved()).toBe(true)

    setPopup(true)
    setPopup(false)

    expect(hasUnsaved()).toBe(true)
  })
})

const YAML_A = 'states:\n  - id: a'
const YAML_EDITED = 'states:\n  - id: a\n  - id: b'

const resolveAfter = <T,>(run: () => void, value: T) =>
  vi.fn(async () => {
    run()
    return value
  })

describe('WorkflowForm - save outcome and baseline (legacy form)', () => {
  beforeEach(() => {
    visualMode.enabled = false
    fieldValues.current = baseValues()
  })

  it("rebaselines to the saved values when onSubmit returns 'stayed'", async () => {
    const { ref } = mount()
    await settle()
    fieldValues.current = { ...baseValues(), description: 'edited' }
    expect(hasUnsaved()).toBe(true)

    await act(async () => ref.current!.save(false))

    expect(hasUnsaved()).toBe(false)
  })

  it("keeps an edit made while the request was in flight dirty after 'stayed'", async () => {
    const onSubmit = resolveAfter(() => {
      fieldValues.current = { ...baseValues(), description: 'typed during the request' }
    }, 'stayed' as const)
    fieldValues.current = { ...baseValues(), description: 'sent' }
    const { ref } = mount({ onSubmit })
    await settle()
    // the baseline was captured from the first values; the payload sent is the one read at save time
    await act(async () => ref.current!.save(false))

    expect(hasUnsaved()).toBe(true)
  })

  it("re-blocks the transition after 'stayed', including after Save and Run", async () => {
    const { ref } = mount()
    await settle()

    await act(async () => ref.current!.save(true))

    expect(navigatingAway.current).toBe(true)
    await waitFor(() => expect(navigatingAway.current).toBe(false))
  })

  it("does not rebaseline and re-blocks after 'error', including after Save and Run", async () => {
    const { ref } = mount({ onSubmit: vi.fn().mockResolvedValue('error') })
    await settle()
    fieldValues.current = { ...baseValues(), description: 'edited' }

    await act(async () => ref.current!.save(true))

    expect(hasUnsaved()).toBe(true)
    await waitFor(() => expect(navigatingAway.current).toBe(false))
  })

  it("re-blocks the transition after 'navigated', including after Save and Run", async () => {
    const { ref } = mount({ onSubmit: vi.fn().mockResolvedValue('navigated') })
    await settle()

    await act(async () => ref.current!.save(true))

    expect(navigatingAway.current).toBe(true)
    await waitFor(() => expect(navigatingAway.current).toBe(false))
  })

  it('keeps legacy behaviour when onSubmit resolves with nothing', async () => {
    const { ref } = mount({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    await settle()
    fieldValues.current = { ...baseValues(), description: 'edited' }

    await act(async () => ref.current!.save(false))

    expect(hasUnsaved()).toBe(true)
    await waitFor(() => expect(navigatingAway.current).toBe(false))
  })

  it('does not re-block after Save and Run when onSubmit resolves with nothing', async () => {
    const { ref } = mount({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    await settle()

    await act(async () => ref.current!.save(true))
    await new Promise((resolve) => {
      setTimeout(resolve, 150)
    })

    expect(navigatingAway.current).toBe(true)
  })

  it('reports saving through onSavingChange and clears it afterwards', async () => {
    let release: (v: 'stayed') => void = () => {}
    const onSubmit = vi.fn(
      () =>
        new Promise<'stayed'>((resolve) => {
          release = resolve
        })
    )
    const onSavingChange = vi.fn()
    const { ref } = mount({ onSubmit, onSavingChange })
    await settle()

    let pending: Promise<void> = Promise.resolve()
    act(() => {
      pending = ref.current!.save(false)
    })
    await waitFor(() => expect(onSavingChange).toHaveBeenLastCalledWith(true))

    await act(async () => {
      release('stayed')
      await pending
    })

    expect(onSavingChange).toHaveBeenLastCalledWith(false)
  })
})

describe('WorkflowForm - visual editor contract', () => {
  beforeEach(() => {
    visualMode.enabled = true
    editor.saveCurrentTab = vi.fn().mockResolvedValue(true)
    editor.yaml = YAML_A
    editor.fields = {}
  })

  it('reports dirtiness through onDirtyChange and clears it after a stayed save', async () => {
    const onDirtyChange = vi.fn()
    const { ref } = mount({ onDirtyChange, workflow: { ...workflow, yaml_config: YAML_A } })
    await settle()
    expect(onDirtyChange).not.toHaveBeenCalledWith(true)

    act(() => editor.props.onConfigurationUpdate(YAML_EDITED))
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)

    editor.yaml = YAML_EDITED
    await act(async () => ref.current!.save(false))

    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
    expect(hasUnsaved()).toBe(false)
  })

  it('reports dirty while the open panel holds edits that were not applied yet', async () => {
    try {
      const onDirtyChange = vi.fn()
      mount({ onDirtyChange, workflow: { ...workflow, yaml_config: YAML_A } })
      await settle()
      expect(onDirtyChange).not.toHaveBeenCalledWith(true)

      // An edit inside the editor makes the form ask the open panel again.
      editor.panelDirty = true
      fireEvent.input(screen.getByTestId('visual-editor'))
      await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true))

      editor.panelDirty = false
      fireEvent.click(screen.getByTestId('visual-editor'))
      await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false))
    } finally {
      editor.panelDirty = false
    }
  })

  it('does not report a panel edit until something happens inside the editor', async () => {
    try {
      const onDirtyChange = vi.fn()
      mount({ onDirtyChange, workflow: { ...workflow, yaml_config: YAML_A } })
      await settle()

      editor.panelDirty = true
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50)
        })
      })
      expect(onDirtyChange).not.toHaveBeenCalledWith(true)

      fireEvent.keyUp(screen.getByTestId('visual-editor'))
      await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true))
    } finally {
      editor.panelDirty = false
    }
  })

  it('hasUnsavedChanges reports the form and the open panel', async () => {
    try {
      const { ref } = mount({ workflow: { ...workflow, yaml_config: YAML_A } })
      await settle()
      expect(ref.current!.hasUnsavedChanges()).toBe(false)

      editor.panelDirty = true
      expect(ref.current!.hasUnsavedChanges()).toBe(true)

      editor.panelDirty = false
      act(() => editor.props.onConfigurationUpdate(YAML_EDITED))
      expect(ref.current!.hasUnsavedChanges()).toBe(true)
    } finally {
      editor.panelDirty = false
    }
  })

  it("keeps a visual edit made during the request dirty after 'stayed'", async () => {
    const onSubmit = vi.fn(async () => {
      editor.props.onConfigurationUpdate('states:\n  - id: typed-later')
      return 'stayed' as const
    })
    const { ref } = mount({ onSubmit, workflow: { ...workflow, yaml_config: YAML_A } })
    await settle()
    act(() => editor.props.onConfigurationUpdate(YAML_EDITED))
    editor.yaml = YAML_EDITED

    await act(async () => ref.current!.save(false))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ yaml_config: YAML_EDITED }),
      false
    )
    expect(hasUnsaved()).toBe(true)
  })

  it('keeps the editor update callbacks stable across edits', async () => {
    mount({ workflow: { ...workflow, yaml_config: YAML_A } })
    await settle()
    const { onConfigurationUpdate, onWorkflowUpdate } = editor.props

    act(() => editor.props.onConfigurationUpdate(YAML_EDITED))
    act(() => editor.props.onWorkflowUpdate({ description: 'edited' }))

    expect(editor.props.onConfigurationUpdate).toBe(onConfigurationUpdate)
    expect(editor.props.onWorkflowUpdate).toBe(onWorkflowUpdate)
  })

  it('getSubmitValues saves the current tab first and returns the payload', async () => {
    const { ref } = mount({ workflow: { ...workflow, yaml_config: YAML_A } })
    await settle()
    editor.yaml = YAML_EDITED

    const values = await ref.current!.getSubmitValues()

    expect(editor.saveCurrentTab).toHaveBeenCalled()
    expect(values).toEqual(expect.objectContaining({ yaml_config: YAML_EDITED, name: 'Test' }))
  })

  it('getSubmitValues returns null when the open panel is invalid', async () => {
    editor.saveCurrentTab = vi.fn().mockResolvedValue(false)
    const { ref } = mount({ workflow: { ...workflow, yaml_config: YAML_A } })
    await settle()

    expect(await ref.current!.getSubmitValues()).toBeNull()
  })

  it('takes yaml_config_history from the latest workflow prop', async () => {
    const { ref, setWorkflow } = mount({ workflow: { ...workflow, yaml_config: YAML_A } })
    await settle()

    const history = [{ id: 'v2' }]
    setWorkflow({ ...workflow, yaml_config: YAML_A, yaml_config_history: history })

    expect((await ref.current!.getSubmitValues()).yaml_config_history).toEqual(history)
  })
})
