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
import { workflowsStore } from '@/store/workflows'
import toaster from '@/utils/toaster'

import { goBackWorkflows } from '../utils/goBackWorkflows'

vi.mock('@/router', () => ({ router: {} }))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useWorkflowAIEnabled: () => [false],
}))

vi.mock('../components/WorkflowsNavigation', () => ({
  default: () => null,
}))

vi.mock('../details/popups/WorkflowStartExecutionPopup', () => ({
  default: () => null,
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
    default: forwardRef(({ onSubmit, workflow }: any, ref) => {
      useImperativeHandle(ref, () => ({
        validateWorkflow: () => ({ isValid: true }),
        triggerValidation: vi.fn(),
        save: (shouldOpenExecution: boolean) =>
          onSubmit(
            {
              name: workflow?.name || 'New workflow',
              yaml_config: workflow?.yaml_config || 'states: []',
            },
            shouldOpenExecution
          ),
        getFormValues: () => ({}),
        openIssuesPanel: vi.fn(),
        clearAllResolvedFields: vi.fn(),
      }))
      return (
        <div data-testid="workflow-form">
          <span data-testid="form-yaml">{workflow?.yaml_config}</span>
          <span data-testid="form-description">{workflow?.description}</span>
          <span data-testid="form-start-hint">{workflow?.start_hint}</span>
          <span data-testid="form-name">{workflow?.name}</span>
        </div>
      )
    }),
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
