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

import { act, fireEvent, render, screen, waitFor, cleanup, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { contractOutcomeStore, takeHandedOverIssues } from '@/store/contractOutcome'
import { ERROR_FORMAT_JSON, workflowsStore } from '@/store/workflows'
import toaster from '@/utils/toaster'

import { goBackWorkflows } from '../utils/goBackWorkflows'

const hoisted = vi.hoisted(() => ({ order: [] as string[] }))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useWorkflowAIEnabled: () => [false],
}))

vi.mock('../components/WorkflowsNavigation', () => ({
  default: () => null,
}))

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChanges: () => ({
    unblockTransition: () => hoisted.order.push('unblock'),
    blockTransition: () => hoisted.order.push('block'),
  }),
}))

vi.mock('../details/popups/WorkflowStartExecutionPopup', () => ({
  default: ({ isVisible, onHide, onStart }: any) =>
    isVisible ? (
      <div data-testid="run-popup">
        <button type="button" onClick={onHide}>
          Close popup
        </button>
        <button
          type="button"
          onClick={() => {
            onHide()
            onStart?.()
          }}
        >
          Start run
        </button>
      </div>
    ) : null,
}))

vi.mock('../components/GenerateWorkflowPopup', () => ({
  default: () => null,
}))

vi.mock('../utils/goBackWorkflows', () => ({
  goBackWorkflows: vi.fn(),
}))

vi.mock('../components/WorkflowPlaceholderValuesPopup', () => ({
  default: ({ visible, placeholders, onSubmit, onHide, error }: any) =>
    visible ? (
      <div data-testid="placeholder-popup">
        <span data-testid="placeholder-keys">{placeholders.join(',')}</span>
        {error && <div role="alert">{error}</div>}
        <button type="button" onClick={() => onSubmit({ assistant_id: 'asst-001' })}>
          Apply
        </button>
        <button type="button" onClick={onHide}>
          Cancel
        </button>
      </div>
    ) : null,
}))

vi.mock('../components/WorkflowForm', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef(
      (
        {
          onSubmit,
          onSavingChange,
          workflow,
          onCheck,
          isChecking,
          isCheckLocked,
          outcomeKey,
          issues,
        }: any,
        ref
      ) => {
        useImperativeHandle(ref, () => ({
          validateWorkflow: () => ({ isValid: true }),
          triggerValidation: vi.fn(),
          save: async (shouldOpenExecution: boolean) => {
            onSavingChange?.(true)
            try {
              return await onSubmit(
                {
                  name: workflow?.name || 'New workflow',
                  yaml_config: workflow?.yaml_config || 'states: []',
                },
                shouldOpenExecution
              )
            } finally {
              onSavingChange?.(false)
            }
          },
          getFormValues: () => ({}),
          getSubmitValues: async () => ({}),
          openIssuesPanel: vi.fn(),
          closeIssuesPanel: vi.fn(),
          clearAllResolvedFields: vi.fn(),
          hasUnsavedChanges: () => true,
        }))
        return (
          <div data-testid="workflow-form">
            {issues?.map((issue: { id: string; message: string }) => (
              <div key={issue.id} data-testid="workflow-issue">
                {issue.message}
              </div>
            ))}
            <button type="button" onClick={onCheck} disabled={isChecking || isCheckLocked}>
              Check
            </button>
            <span data-testid="form-outcome-key">{outcomeKey}</span>
            <span data-testid="form-yaml">{workflow?.yaml_config}</span>
            <span data-testid="form-description">{workflow?.description}</span>
            <span data-testid="form-start-hint">{workflow?.start_hint}</span>
            <span data-testid="form-name">{workflow?.name}</span>
          </div>
        )
      }
    ),
  }
})

const TEMPLATE_SLUG = 'template-placeholder-variables-example'
const TEMPLATE_SLUG_A = 'template-slug-a'
const TEMPLATE_SLUG_B = 'template-slug-b'

const setFromTemplateRoute = (slug = TEMPLATE_SLUG) => {
  mockRouterState.path = `/workflows/from-template/${slug}`
  mockRouterState.currentRoute.value = {
    path: `/workflows/from-template/${slug}`,
    name: 'new-workflow-from-template',
    params: { slug },
    query: {},
    hash: '',
  }
  ;(mockRouterState as { params: Record<string, string> }).params = { slug }
}

describe('NewWorkflowPage create-from-template', () => {
  beforeEach(() => {
    setFromTemplateRoute()
    workflowsStore.loadShowNewWorkflowAIPopup = vi.fn().mockReturnValue(false)
    workflowsStore.materializeWorkflowTemplate =
      vi.fn() as typeof workflowsStore.materializeWorkflowTemplate
    mockRouterState.push.mockClear()
    vi.mocked(goBackWorkflows).mockClear()
    vi.mocked(toaster.error).mockClear()
    vi.mocked(toaster.info).mockClear()
    history.stack = []
    history.currentIndex = -1
  })

  afterEach(() => {
    cleanup()
    history.stack = []
    history.currentIndex = -1
  })

  it('opens the variables popup when required_variables is non-empty', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('assistant_id')
    expect(screen.queryByTestId('workflow-form')).not.toBeInTheDocument()
    expect(workflowsStore.materializeWorkflowTemplate).not.toHaveBeenCalled()
  })

  it('seeds the form from GET and skips materialize when required_variables is empty', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      description: 'From GET',
      start_hint: 'Hint',
      required_variables: [],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('workflow-form')).toBeInTheDocument())
    expect(screen.queryByTestId('placeholder-popup')).not.toBeInTheDocument()
    expect(screen.getByTestId('form-yaml')).toHaveTextContent('states: []')
    expect(screen.getByTestId('form-description')).toHaveTextContent('From GET')
    expect(screen.getByTestId('form-name')).toHaveTextContent('')
    expect(workflowsStore.materializeWorkflowTemplate).not.toHaveBeenCalled()
  })

  it('seeds the form from GET and skips materialize when required_variables is omitted', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      description: 'From GET',
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('workflow-form')).toBeInTheDocument())
    expect(screen.queryByTestId('placeholder-popup')).not.toBeInTheDocument()
    expect(screen.getByTestId('form-yaml')).toHaveTextContent('states: []')
    expect(workflowsStore.materializeWorkflowTemplate).not.toHaveBeenCalled()
  })

  it('calls materialize on Apply and merges the seed into the form', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      description: 'Pending',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug
    workflowsStore.materializeWorkflowTemplate = vi.fn().mockResolvedValue({
      yaml_config: 'states:\n  - id: start',
      description: 'Materialized',
      start_hint: 'Run it',
    }) as typeof workflowsStore.materializeWorkflowTemplate

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() =>
      expect(workflowsStore.materializeWorkflowTemplate).toHaveBeenCalledWith(TEMPLATE_SLUG, {
        assistant_id: 'asst-001',
      })
    )
    await waitFor(() => expect(screen.getByTestId('workflow-form')).toBeInTheDocument())
    expect(screen.queryByTestId('placeholder-popup')).not.toBeInTheDocument()
    expect(screen.getByTestId('form-yaml')).toHaveTextContent('id: start')
    expect(screen.getByTestId('form-description')).toHaveTextContent('Materialized')
    expect(screen.getByTestId('form-start-hint')).toHaveTextContent('Run it')
    expect(screen.getByTestId('form-name')).toHaveTextContent('')
  })

  it('keeps the popup open when materialize returns no yaml_config', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug
    workflowsStore.materializeWorkflowTemplate = vi.fn().mockResolvedValue({
      description: 'No yaml',
    }) as typeof workflowsStore.materializeWorkflowTemplate

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith('Failed to materialize template')
    )
    expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to materialize template')
    expect(screen.queryByTestId('workflow-form')).not.toBeInTheDocument()
  })

  it('keeps the popup open and shows a message when materialize fails', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug
    workflowsStore.materializeWorkflowTemplate = vi.fn().mockRejectedValue({
      parsedError: {
        message: 'Required placeholder variables are missing or blank.',
        details: {
          error_type: 'missing_placeholder_variables',
          errors: [{ placeholder: 'assistant_id' }],
        },
      },
    }) as typeof workflowsStore.materializeWorkflowTemplate

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith(
        'Required placeholder variables are missing or blank.'
      )
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Required placeholder variables are missing or blank.'
    )
    expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument()
    expect(screen.queryByTestId('workflow-form')).not.toBeInTheDocument()
  })

  it('maps materialization_failed to a dialog-visible message', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug
    workflowsStore.materializeWorkflowTemplate = vi.fn().mockRejectedValue({
      parsedError: {
        message: 'The workflow template could not be materialized.',
        details: {
          error_type: 'materialization_failed',
        },
      },
    }) as typeof workflowsStore.materializeWorkflowTemplate

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The workflow template could not be materialized.'
      )
    )
    expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument()
  })

  it('returns to the workflows list when the variables popup is cancelled', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(
      within(screen.getByTestId('placeholder-popup')).getByRole('button', { name: 'Cancel' })
    )

    expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'workflows-all' })
    expect(goBackWorkflows).not.toHaveBeenCalled()
    expect(workflowsStore.materializeWorkflowTemplate).not.toHaveBeenCalled()
  })

  it('goes back when the variables popup is cancelled with history', async () => {
    history.stack = [
      { name: 'workflows-templates', params: {}, query: {} },
      { name: 'view-workflow-template', params: { slug: TEMPLATE_SLUG }, query: {} },
    ]
    history.currentIndex = 1
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(
      within(screen.getByTestId('placeholder-popup')).getByRole('button', { name: 'Cancel' })
    )

    expect(goBackWorkflows).toHaveBeenCalled()
    expect(mockRouterState.push).not.toHaveBeenCalled()
  })

  it('does not overlay a slower previous template fetch over a newer slug', async () => {
    let resolveFirst!: (value: unknown) => void
    const firstFetch = new Promise((resolve) => {
      resolveFirst = resolve
    })
    workflowsStore.getWorkflowTemplateBySlug = vi.fn((requestedSlug: string) => {
      if (requestedSlug === TEMPLATE_SLUG_A) return firstFetch
      return Promise.resolve({
        slug: TEMPLATE_SLUG_B,
        name: 'B',
        yaml_config: 'states: []',
        required_variables: ['datasource_id'],
      })
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    setFromTemplateRoute(TEMPLATE_SLUG_A)
    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    const { rerender } = render(<NewWorkflowPage />)

    await waitFor(() =>
      expect(workflowsStore.getWorkflowTemplateBySlug).toHaveBeenCalledWith(
        TEMPLATE_SLUG_A,
        expect.any(AbortSignal)
      )
    )

    setFromTemplateRoute(TEMPLATE_SLUG_B)
    rerender(<NewWorkflowPage />)

    await waitFor(() =>
      expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('datasource_id')
    )

    await act(async () => {
      resolveFirst({
        slug: TEMPLATE_SLUG_A,
        name: 'A',
        yaml_config: 'states: []',
        required_variables: ['assistant_id'],
      })
    })

    expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('datasource_id')
    expect(screen.getByTestId('placeholder-keys')).not.toHaveTextContent('assistant_id')
  })

  it('resets the variables popup when a new template fetch starts', async () => {
    let resolveSecond!: (value: unknown) => void
    const secondFetch = new Promise((resolve) => {
      resolveSecond = resolve
    })
    workflowsStore.getWorkflowTemplateBySlug = vi.fn((requestedSlug: string) => {
      if (requestedSlug === TEMPLATE_SLUG_A) {
        return Promise.resolve({
          slug: TEMPLATE_SLUG_A,
          name: 'A',
          yaml_config: 'states: []',
          required_variables: ['assistant_id'],
        })
      }
      return secondFetch
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    setFromTemplateRoute(TEMPLATE_SLUG_A)
    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    const { rerender } = render(<NewWorkflowPage />)

    await waitFor(() =>
      expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('assistant_id')
    )

    setFromTemplateRoute(TEMPLATE_SLUG_B)
    rerender(<NewWorkflowPage />)

    await waitFor(() => expect(screen.queryByTestId('placeholder-popup')).not.toBeInTheDocument())

    await act(async () => {
      resolveSecond({
        slug: TEMPLATE_SLUG_B,
        name: 'B',
        yaml_config: 'states: []',
        required_variables: ['datasource_id'],
      })
    })

    await waitFor(() =>
      expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('datasource_id')
    )
  })

  it('ignores a late materialize result after Cancel', async () => {
    let resolveMaterialize!: (value: unknown) => void
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug
    workflowsStore.materializeWorkflowTemplate = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMaterialize = resolve
        })
    ) as typeof workflowsStore.materializeWorkflowTemplate

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(workflowsStore.materializeWorkflowTemplate).toHaveBeenCalled())

    fireEvent.click(
      within(screen.getByTestId('placeholder-popup')).getByRole('button', { name: 'Cancel' })
    )

    await act(async () => {
      resolveMaterialize({
        yaml_config: 'states:\n  - id: start',
        description: 'Late seed',
        start_hint: 'Too late',
      })
    })

    expect(screen.queryByTestId('workflow-form')).not.toBeInTheDocument()
    expect(screen.queryByText('Late seed')).not.toBeInTheDocument()
  })

  it('does not keep the previous template form after a failed refetch', async () => {
    workflowsStore.getWorkflowTemplateBySlug = vi.fn((requestedSlug: string) => {
      if (requestedSlug === TEMPLATE_SLUG_A) {
        return Promise.resolve({
          id: 'tpl-a',
          slug: TEMPLATE_SLUG_A,
          name: 'A',
          yaml_config: 'states: []',
          description: 'From A',
          required_variables: [],
        })
      }
      return Promise.reject(new Error('not found'))
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    setFromTemplateRoute(TEMPLATE_SLUG_A)
    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    const { rerender } = render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('workflow-form')).toBeInTheDocument())
    expect(screen.getByTestId('form-description')).toHaveTextContent('From A')

    setFromTemplateRoute(TEMPLATE_SLUG_B)
    rerender(<NewWorkflowPage />)

    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Failed to load workflow data'))

    expect(screen.queryByTestId('workflow-form')).not.toBeInTheDocument()
    expect(screen.queryByText('From A')).not.toBeInTheDocument()
  })

  it('does not toast a load failure when a previous template fetch aborts', async () => {
    let rejectFirst!: (reason: unknown) => void
    const firstFetch = new Promise((_, reject) => {
      rejectFirst = reject
    })
    workflowsStore.getWorkflowTemplateBySlug = vi.fn((requestedSlug: string) => {
      if (requestedSlug === TEMPLATE_SLUG_A) return firstFetch
      return Promise.resolve({
        id: 'tpl-b',
        slug: TEMPLATE_SLUG_B,
        name: 'B',
        yaml_config: 'states: []',
        required_variables: ['datasource_id'],
      })
    }) as typeof workflowsStore.getWorkflowTemplateBySlug

    setFromTemplateRoute(TEMPLATE_SLUG_A)
    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    const { rerender } = render(<NewWorkflowPage />)

    await waitFor(() =>
      expect(workflowsStore.getWorkflowTemplateBySlug).toHaveBeenCalledWith(
        TEMPLATE_SLUG_A,
        expect.any(AbortSignal)
      )
    )

    setFromTemplateRoute(TEMPLATE_SLUG_B)
    rerender(<NewWorkflowPage />)

    await waitFor(() =>
      expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('datasource_id')
    )

    const abortError = new Error('Aborted')
    abortError.name = 'AbortError'
    await act(async () => {
      rejectFirst(abortError)
    })

    expect(toaster.error).not.toHaveBeenCalledWith('Failed to load workflow data')
  })

  it('ignores a late materialize result after the template slug changes', async () => {
    let resolveMaterializeA!: (value: unknown) => void
    workflowsStore.getWorkflowTemplateBySlug = vi.fn((requestedSlug: string) => {
      if (requestedSlug === TEMPLATE_SLUG_A) {
        return Promise.resolve({
          id: 'tpl-a',
          slug: TEMPLATE_SLUG_A,
          name: 'A',
          yaml_config: 'states: []',
          required_variables: ['assistant_id'],
        })
      }
      return Promise.resolve({
        id: 'tpl-b',
        slug: TEMPLATE_SLUG_B,
        name: 'B',
        yaml_config: 'states: []',
        required_variables: ['datasource_id'],
      })
    }) as typeof workflowsStore.getWorkflowTemplateBySlug
    workflowsStore.materializeWorkflowTemplate = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMaterializeA = resolve
        })
    ) as typeof workflowsStore.materializeWorkflowTemplate

    setFromTemplateRoute(TEMPLATE_SLUG_A)
    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    const { rerender } = render(<NewWorkflowPage />)

    await waitFor(() =>
      expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('assistant_id')
    )
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(workflowsStore.materializeWorkflowTemplate).toHaveBeenCalled())

    setFromTemplateRoute(TEMPLATE_SLUG_B)
    rerender(<NewWorkflowPage />)

    await waitFor(() =>
      expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('datasource_id')
    )

    await act(async () => {
      resolveMaterializeA({
        yaml_config: 'states:\n  - id: from-a',
        description: 'Seed A',
      })
    })

    expect(screen.queryByTestId('workflow-form')).not.toBeInTheDocument()
    expect(screen.queryByText('Seed A')).not.toBeInTheDocument()
    expect(screen.getByTestId('placeholder-keys')).toHaveTextContent('datasource_id')
  })

  it('ignores a late materialize rejection after Cancel', async () => {
    let rejectMaterialize!: (reason: unknown) => void
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug
    workflowsStore.materializeWorkflowTemplate = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectMaterialize = reject
        })
    ) as typeof workflowsStore.materializeWorkflowTemplate

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(workflowsStore.materializeWorkflowTemplate).toHaveBeenCalled())

    fireEvent.click(
      within(screen.getByTestId('placeholder-popup')).getByRole('button', { name: 'Cancel' })
    )

    await act(async () => {
      rejectMaterialize({
        parsedError: { message: 'Too late' },
      })
    })

    expect(toaster.error).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('saves leftover placeholder tokens instead of blocking create', async () => {
    const leftoverYaml = `states:\n  - id: \${${'input:assistant_id'}}`
    workflowsStore.getWorkflowTemplateBySlug = vi.fn().mockResolvedValue({
      slug: TEMPLATE_SLUG,
      name: 'Example',
      yaml_config: 'states: []',
      required_variables: ['assistant_id'],
    }) as typeof workflowsStore.getWorkflowTemplateBySlug
    workflowsStore.materializeWorkflowTemplate = vi.fn().mockResolvedValue({
      yaml_config: leftoverYaml,
    }) as typeof workflowsStore.materializeWorkflowTemplate
    workflowsStore.createWorkflow = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: { id: 'new-wf' } }),
    }) as typeof workflowsStore.createWorkflow

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(screen.getByTestId('workflow-form')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(workflowsStore.createWorkflow).toHaveBeenCalled())
    expect(vi.mocked(workflowsStore.createWorkflow).mock.calls[0][0]).toEqual({
      name: 'New workflow',
      yaml_config: leftoverYaml,
    })
  })
})

describe('NewWorkflowPage clone and blank create', () => {
  beforeEach(() => {
    workflowsStore.loadShowNewWorkflowAIPopup = vi.fn().mockReturnValue(false)
    mockRouterState.push.mockClear()
    vi.mocked(goBackWorkflows).mockClear()
    vi.mocked(toaster.error).mockClear()
    history.stack = []
    history.currentIndex = -1
  })

  afterEach(() => {
    cleanup()
    history.stack = []
    history.currentIndex = -1
  })

  it('shows the form after a blank create page finishes loading', async () => {
    mockRouterState.path = '/workflows/new'
    mockRouterState.currentRoute.value = {
      path: '/workflows/new',
      name: 'new-workflow',
      params: {},
      query: {},
      hash: '',
    }
    ;(mockRouterState as { params: Record<string, string> }).params = {}

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('workflow-form')).toBeInTheDocument())
    expect(screen.queryByTestId('placeholder-popup')).not.toBeInTheDocument()
  })

  it('shows the form after a clone page finishes loading', async () => {
    mockRouterState.path = '/workflows/wf-1/clone'
    mockRouterState.currentRoute.value = {
      path: '/workflows/wf-1/clone',
      name: 'clone-workflow',
      params: { id: 'wf-1' },
      query: {},
      hash: '',
    }
    ;(mockRouterState as { params: Record<string, string> }).params = { id: 'wf-1' }
    workflowsStore.getWorkflow = vi.fn().mockResolvedValue({
      id: 'wf-1',
      name: 'Original',
      yaml_config: 'states: []',
    }) as typeof workflowsStore.getWorkflow

    const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
    render(<NewWorkflowPage />)

    await waitFor(() => expect(screen.getByTestId('workflow-form')).toBeInTheDocument())
    expect(workflowsStore.getWorkflow).toHaveBeenCalledWith('wf-1')
    expect(screen.getByTestId('form-yaml')).toHaveTextContent('states: []')
    expect(screen.getByTestId('form-name')).toHaveTextContent('')
    expect(screen.queryByTestId('placeholder-popup')).not.toBeInTheDocument()
  })
})

const renderBlankPage = async () => {
  mockRouterState.path = '/workflows/new'
  mockRouterState.currentRoute.value = {
    path: '/workflows/new',
    name: 'new-workflow',
    params: {},
    query: {},
    hash: '',
  }
  ;(mockRouterState as { params: Record<string, string> }).params = {}
  const { default: NewWorkflowPage } = await import('../NewWorkflowPage')
  const view = render(<NewWorkflowPage />)
  await waitFor(() => expect(screen.getByTestId('workflow-form')).toBeInTheDocument())
  return view
}

const mockCreate = (body: unknown) => {
  workflowsStore.createWorkflow = vi.fn().mockResolvedValue({
    json: () => Promise.resolve(body),
  }) as typeof workflowsStore.createWorkflow
}

describe('NewWorkflowPage - contract create outcomes', () => {
  const contractWarning = (id: string, outcome = 'WARNING') => ({
    id,
    kind: 'contract_validation',
    outcome,
    state_id: 's1',
    path: 'task',
    message: `issue ${id}`,
    config_section: 'states',
    config_line: 3,
  })
  const warnedBody = () => ({
    data: { id: 'wf-created' },
    warnings: [contractWarning('w1'), contractWarning('u1', 'UNVERIFIED')],
  })
  const cleanBody = () => ({
    data: { id: 'wf-created' },
    warnings: [contractWarning('u1', 'UNVERIFIED')],
  })
  beforeEach(() => {
    workflowsStore.loadShowNewWorkflowAIPopup = vi.fn().mockReturnValue(false)
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    mockRouterState.replace.mockImplementation(() => {
      hoisted.order.push(
        `replace:${contractOutcomeStore.outcome?.key ?? 'none'}:${
          contractOutcomeStore.outcome?.context ?? 'none'
        }`
      )
    })
    hoisted.order.length = 0
    contractOutcomeStore.outcome = null
    takeHandedOverIssues('')
    vi.mocked(goBackWorkflows).mockClear()
    vi.mocked(toaster.error).mockClear()
    vi.mocked(toaster.info).mockClear()
    history.stack = []
    history.currentIndex = -1
  })

  afterEach(() => {
    cleanup()
    contractOutcomeStore.outcome = null
    mockRouterState.replace.mockReset()
  })

  it('hands a warned create over: unblock, outcome under the created id, replace to edit, guard back on', async () => {
    mockCreate(warnedBody())
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(mockRouterState.replace).toHaveBeenCalled())
    expect(hoisted.order).toEqual(['unblock', 'replace:wf-created:created', 'block'])
    expect(mockRouterState.replace).toHaveBeenCalledWith({
      name: 'edit-workflow',
      params: { id: 'wf-created' },
    })
    // The store keeps the note; the issues themselves are handed over once to the edit page.
    expect(contractOutcomeStore.outcome).not.toHaveProperty('issues')
    expect(takeHandedOverIssues('wf-created')?.map((issue) => issue.id)).toEqual(['w1', 'u1'])
    expect(goBackWorkflows).not.toHaveBeenCalled()
    expect(toaster.info).not.toHaveBeenCalled()
  })

  it('does not open the run popup for a warned Save and Run', async () => {
    mockCreate(warnedBody())
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save and Run' }))

    await waitFor(() => expect(mockRouterState.replace).toHaveBeenCalled())
    expect(screen.queryByTestId('run-popup')).not.toBeInTheDocument()
  })

  it('keeps Save and Save and Run disabled after a successful create so no second create happens', async () => {
    mockCreate(cleanBody())
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save and Run' }))
    await waitFor(() => expect(screen.getByTestId('run-popup')).toBeInTheDocument())

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save and Run' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save and Run' }))
    expect(workflowsStore.createWorkflow).toHaveBeenCalledTimes(1)
  })

  it('replaces the route with the edit page when the clean Save and Run popup is closed', async () => {
    mockCreate(cleanBody())
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save and Run' }))
    await waitFor(() => expect(screen.getByTestId('run-popup')).toBeInTheDocument())
    hoisted.order.length = 0

    fireEvent.click(screen.getByRole('button', { name: 'Close popup' }))

    await waitFor(() => expect(mockRouterState.replace).toHaveBeenCalled())
    expect(hoisted.order).toEqual(['unblock', 'replace:none:none', 'block'])
    expect(mockRouterState.replace).toHaveBeenCalledWith({
      name: 'edit-workflow',
      params: { id: 'wf-created' },
    })
  })

  it('leaves the route to the run popup when the run starts', async () => {
    mockCreate(cleanBody())
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save and Run' }))
    await waitFor(() => expect(screen.getByTestId('run-popup')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Start run' }))
    await act(async () => {
      await Promise.resolve()
    })

    expect(mockRouterState.replace).not.toHaveBeenCalled()
  })

  it('goes back after a clean or UNVERIFIED-only Save with the usual toast', async () => {
    mockCreate(cleanBody())
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(goBackWorkflows).toHaveBeenCalled())
    expect(toaster.info).toHaveBeenCalledWith('Workflow has been created successfully!')
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('does not allow a second create when the created body cannot be read', async () => {
    workflowsStore.createWorkflow = vi.fn().mockResolvedValue({
      json: () => Promise.reject(new SyntaxError('bad json')),
    }) as typeof workflowsStore.createWorkflow
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(goBackWorkflows).toHaveBeenCalled())
    expect(toaster.info).toHaveBeenCalledWith(expect.stringMatching(/run Check/i))
    expect(toaster.error).not.toHaveBeenCalled()
    expect(workflowsStore.createWorkflow).toHaveBeenCalledTimes(1)
  })

  it('leaves for the list without a failure toast when a warned body carries no id', async () => {
    mockCreate({ warnings: [contractWarning('w1')] })
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(goBackWorkflows).toHaveBeenCalled())
    expect(toaster.error).not.toHaveBeenCalled()
    expect(mockRouterState.replace).not.toHaveBeenCalled()
  })

  it('treats an ERROR in a 2xx body as a finding to hand to the edit page', async () => {
    mockCreate({ data: { id: 'wf-created' }, warnings: [contractWarning('e1', 'ERROR')] })
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(contractOutcomeStore.outcome?.key).toBe('wf-created'))
    expect(goBackWorkflows).not.toHaveBeenCalled()
  })

  it('accepts a create that resolves after unmount without navigating or writing the store', async () => {
    let resolveCreate!: (value: unknown) => void
    workflowsStore.createWorkflow = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve
        })
    ) as typeof workflowsStore.createWorkflow
    const { unmount } = await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(workflowsStore.createWorkflow).toHaveBeenCalled())
    unmount()
    await act(async () => {
      resolveCreate({ json: () => Promise.resolve(warnedBody()) })
    })

    expect(mockRouterState.replace).not.toHaveBeenCalled()
    expect(goBackWorkflows).not.toHaveBeenCalled()
    expect(contractOutcomeStore.outcome).toBeNull()
    expect(toaster.info).not.toHaveBeenCalled()
  })

  it('keeps the page on a contract rejection and stores it under the new key', async () => {
    workflowsStore.createWorkflow = vi.fn().mockRejectedValue({
      parsedError: {
        message: 'Contract validation failed',
        details: {
          error_type: 'contract_validation',
          errors: [
            {
              id: 'e1',
              kind: 'contract_validation',
              outcome: 'ERROR',
              state_id: 's1',
              path: 'task',
              message: 'broken contract',
            },
          ],
          warnings: [],
        },
      },
    }) as typeof workflowsStore.createWorkflow
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(contractOutcomeStore.outcome?.key).toBe('new'))
    expect(contractOutcomeStore.outcome?.context).toBe('rejected')
    expect(mockRouterState.replace).not.toHaveBeenCalled()
    expect(goBackWorkflows).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('toasts the message of a contract rejection that carries no issue details', async () => {
    workflowsStore.createWorkflow = vi.fn().mockRejectedValue({
      parsedError: {
        message: '',
        details: { error_type: 'contract_validation', errors: [], warnings: [] },
      },
    }) as typeof workflowsStore.createWorkflow
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('An error occurred'))
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('routes a non-contract structured rejection to the panel as rejected', async () => {
    workflowsStore.createWorkflow = vi.fn().mockRejectedValue({
      parsedError: {
        message: 'Validation failed',
        details: {
          error_type: 'schema_validation',
          message: 'bad',
          errors: [{ id: 'e1', message: 'bad field', path: 'name', config_line: 2 }],
        },
      },
    }) as typeof workflowsStore.createWorkflow
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('bad field')).toBeInTheDocument()
    expect(contractOutcomeStore.outcome).toMatchObject({ key: 'new', context: 'rejected' })
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it('escapes the message of a rejection that is not a structured validation error', async () => {
    workflowsStore.createWorkflow = vi.fn().mockRejectedValue({
      parsedError: { message: 'Bad name', details: '<b>x</b> & y' },
    }) as typeof workflowsStore.createWorkflow
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith('Bad name: &lt;b&gt;x&lt;/b&gt; &amp; y')
    )
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('toasts a generic failure when the create fails without a backend error body', async () => {
    workflowsStore.createWorkflow = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as typeof workflowsStore.createWorkflow
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Failed to save the workflow'))
    expect(goBackWorkflows).not.toHaveBeenCalled()
  })

  it('creates with the JSON error format', async () => {
    mockCreate(cleanBody())
    await renderBlankPage()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(workflowsStore.createWorkflow).toHaveBeenCalled())
    expect(vi.mocked(workflowsStore.createWorkflow).mock.calls[0][1]).toBe(ERROR_FORMAT_JSON)
  })

  describe('locks and Check wiring', () => {
    const neverSettles = () => new Promise<Response>(() => {})
    const checkBody = { warnings: [contractWarning('w1')] }
    const mockValidate = (body: unknown) => {
      workflowsStore.validateWorkflowConfig = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(body),
      }) as typeof workflowsStore.validateWorkflowConfig
    }

    it('locks Save, Save and Run and Check while a create is in flight', async () => {
      workflowsStore.createWorkflow = vi
        .fn()
        .mockImplementation(neverSettles) as typeof workflowsStore.createWorkflow
      await renderBlankPage()

      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled())
      expect(screen.getByRole('button', { name: 'Save and Run' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      expect(workflowsStore.createWorkflow).toHaveBeenCalledTimes(1)
    })

    it('locks Save and Save and Run while a Check is in flight', async () => {
      workflowsStore.validateWorkflowConfig = vi
        .fn()
        .mockImplementation(neverSettles) as typeof workflowsStore.validateWorkflowConfig
      await renderBlankPage()

      fireEvent.click(screen.getByRole('button', { name: 'Check' }))

      await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled())
      expect(screen.getByRole('button', { name: 'Save and Run' })).toBeDisabled()
    })

    it('locks Check once the workflow has been created', async () => {
      mockCreate(cleanBody())
      await renderBlankPage()
      expect(screen.getByRole('button', { name: 'Check' })).toBeEnabled()

      fireEvent.click(screen.getByRole('button', { name: 'Save and Run' }))
      await waitFor(() => expect(screen.getByTestId('run-popup')).toBeInTheDocument())

      expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled()
    })

    it('wires Check to the id-less validation and stores the result under the new key', async () => {
      mockValidate(checkBody)
      await renderBlankPage()

      fireEvent.click(screen.getByRole('button', { name: 'Check' }))

      await waitFor(() => expect(contractOutcomeStore.outcome?.key).toBe('new'))
      expect(contractOutcomeStore.outcome?.context).toBe('not-saved')
      expect(screen.getAllByTestId('workflow-issue').map((node) => node.textContent)).toEqual([
        'issue w1',
      ])
      const args = vi.mocked(workflowsStore.validateWorkflowConfig).mock.calls[0][0]
      expect(args.id).toBeUndefined()
      expect(args.body).toEqual({})
      expect(screen.getByTestId('form-outcome-key')).toHaveTextContent('new')
    })

    it('drops the findings of an earlier Check when the next save starts', async () => {
      mockValidate(checkBody)
      await renderBlankPage()
      fireEvent.click(screen.getByRole('button', { name: 'Check' }))
      await waitFor(() => expect(contractOutcomeStore.outcome?.context).toBe('not-saved'))

      workflowsStore.createWorkflow = vi.fn().mockRejectedValue({
        parsedError: {
          message: 'Validation failed',
          details: {
            error_type: 'resource_validation',
            message: '',
            errors: [{ state_id: 's1', message: 'plain failure', config_line: 2 }],
          },
        },
      }) as typeof workflowsStore.createWorkflow
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(workflowsStore.createWorkflow).toHaveBeenCalled())
      await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled())
      // The rejection replaces the Check findings and its "not saved yet" note.
      expect(await screen.findByText('plain failure')).toBeInTheDocument()
      expect(screen.queryByText('issue w1')).not.toBeInTheDocument()
      expect(contractOutcomeStore.outcome).toMatchObject({ key: 'new', context: 'rejected' })
    })
  })

  it('clears the new-page outcome on unmount', async () => {
    const { unmount } = await renderBlankPage()
    contractOutcomeStore.outcome = {
      key: 'new',
      context: 'not-saved',
    }
    unmount()
    expect(contractOutcomeStore.outcome).toBeNull()
  })
})
