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

import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { userStore } from '@/store/user'

import ProjectModal from '../ProjectModal'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const { useFeatureFlagMock, userStoreMock } = vi.hoisted(() => ({
  useFeatureFlagMock: vi.fn(() => [false, true] as [boolean, boolean]),
  userStoreMock: { user: { isAdmin: false, isMaintainer: false } },
}))

vi.mock('@/store/user', () => ({
  userStore: userStoreMock,
}))

vi.mock('@/store/costCenters', () => ({
  costCentersStore: {
    getCostCenterOptions: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: () => useFeatureFlagMock(),
}))

vi.mock('@/components/Popup', () => ({
  default: ({
    visible,
    children,
    onSubmit,
    header,
  }: {
    visible: boolean
    children: React.ReactNode
    onSubmit?: () => void
    header?: string
  }) => {
    if (!visible) return null
    return (
      <dialog aria-label={header} open>
        <form
          data-testid="modal-form"
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit?.()
          }}
        >
          {children}
          <button type="submit">Submit</button>
        </form>
      </dialog>
    )
  },
}))

vi.mock('@/components/form/Textarea', () => ({
  default: ({ id, label, required, error, ...rest }: any) => (
    <div>
      <label htmlFor={id}>
        {label}
        {required && ' *'}
      </label>
      <textarea id={id} data-testid={id} {...rest} />
      {error && <span data-testid={`${id}-error`}>{error}</span>}
    </div>
  ),
}))

vi.mock('@/components/form/Input', () => ({
  default: ({ id, label, required, error, disabled, onChange, value, ...rest }: any) => (
    <div>
      <label htmlFor={id}>
        {label}
        {required && ' *'}
      </label>
      <input
        id={id}
        data-testid={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={onChange}
        {...rest}
      />
      {error && <span data-testid={`${id}-error`}>{error}</span>}
    </div>
  ),
}))

vi.mock('@/components/form/Switch', () => ({
  default: ({ id, label, value, disabled, onChange }: any) => (
    <div data-testid={`switch-${id}`}>
      {label}
      <input
        type="checkbox"
        role="switch"
        data-testid={`switch-input-${id}`}
        checked={!!value}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  ),
}))

vi.mock('@/components/form/Autocomplete', () => ({
  default: ({ id, value, onChange, showClear }: any) => (
    <div>
      <input data-testid={id} value={value ?? ''} readOnly />
      {showClear && value ? (
        <button type="button" data-testid={`${id}-clear`} onClick={() => onChange('')}>
          clear
        </button>
      ) : null}
    </div>
  ),
}))

// ─── Helpers ───────────────────────────────────────────────────────────────────

function renderModal(props: Partial<Parameters<typeof ProjectModal>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onHide = vi.fn()
  render(
    <ProjectModal visible={true} onHide={onHide} onSubmit={onSubmit} project={null} {...props} />
  )
  return { onSubmit, onHide }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('ProjectModal — name and display_name are independent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not derive name from display_name as user types', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByTestId('display_name'), 'My Team Project')

    // Name is entered independently and must never be auto-filled from display_name.
    expect(screen.getByTestId<HTMLInputElement>('name').value).toBe('')
  })

  it('keeps a manually entered name regardless of display_name changes', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByTestId('name'), 'custom-name')
    await user.type(screen.getByTestId('display_name'), 'My Team')

    expect(screen.getByTestId<HTMLInputElement>('name').value).toBe('custom-name')
  })

  it('does not auto-derive in edit mode (name is disabled)', () => {
    renderModal({
      project: {
        id: 'proj-1',
        name: 'existing-project',
        display_name: null,
        description: 'desc',
        project_type: 'shared',
        user_count: 2,
        admin_count: 1,
      } as any,
    })

    const nameInput = screen.getByTestId<HTMLInputElement>('name')
    expect(nameInput.disabled).toBe(true)
    expect(nameInput.value).toBe('existing-project')
  })

  it('pre-fills display_name from project in edit mode', () => {
    renderModal({
      project: {
        id: 'proj-1',
        name: 'existing-project',
        display_name: 'Existing Project',
        description: 'desc',
        project_type: 'shared',
        user_count: 2,
        admin_count: 1,
      } as any,
    })

    expect(screen.getByTestId<HTMLInputElement>('display_name').value).toBe('Existing Project')
  })
})

describe('ProjectModal — form submission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('submits display_name and name together', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(screen.getByTestId('name'), 'my-project')
    await user.type(screen.getByTestId('display_name'), 'My Project')
    await user.type(screen.getByTestId('description'), 'A description')

    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-project',
          display_name: 'My Project',
        })
      )
    })
  })

  it('submits display_name as undefined when left empty on create (no clear_display_name)', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(screen.getByTestId('name'), 'manual-name')
    await user.type(screen.getByTestId('description'), 'A description')

    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: undefined,
          clear_display_name: false,
        })
      )
    })
  })

  it('sends clear_display_name=true when an existing display_name is cleared in edit mode (EPMCDME-13486)', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal({
      project: {
        id: 'proj-1',
        name: 'existing-project',
        display_name: 'Existing Project',
        description: 'desc',
        project_type: 'shared',
        user_count: 2,
        admin_count: 1,
      } as any,
    })

    const displayNameInput = screen.getByTestId<HTMLInputElement>('display_name')
    await user.clear(displayNameInput)

    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: undefined,
          clear_display_name: true,
        })
      )
    })
  })
})

describe('ProjectModal — optional description (EPMCDME-14336)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows creating a project with an empty description', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal()

    await user.type(screen.getByTestId('name'), 'no-desc-project')
    // description intentionally left blank

    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'no-desc-project',
          description: undefined,
          clear_description: false,
        })
      )
    })
    expect(screen.queryByTestId('description-error')).toBeNull()
  })

  it('sends clear_description=true when an existing description is cleared in edit mode', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal({
      project: {
        id: 'proj-1',
        name: 'existing-project',
        display_name: 'Existing Project',
        description: 'previous description',
        project_type: 'shared',
        user_count: 2,
        admin_count: 1,
      } as any,
    })

    const descriptionInput = screen.getByTestId<HTMLTextAreaElement>('description')
    await user.clear(descriptionInput)

    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          clear_description: true,
        })
      )
    })
  })

  it('does not set clear_description when a new description is provided in edit mode', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal({
      project: {
        id: 'proj-1',
        name: 'existing-project',
        display_name: 'Existing Project',
        description: 'previous',
        project_type: 'shared',
        user_count: 2,
        admin_count: 1,
      } as any,
    })

    const descriptionInput = screen.getByTestId<HTMLTextAreaElement>('description')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'brand new')

    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'brand new',
          clear_description: false,
        })
      )
    })
  })

  it('rejects a description longer than 500 characters', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByTestId('name'), 'over-limit')
    // React-hook-form's yup resolver validates on submit; type a string just over 500.
    const longText = 'a'.repeat(501)
    const descriptionInput = screen.getByTestId<HTMLTextAreaElement>('description')
    await act(async () => {
      fireEvent.change(descriptionInput, { target: { value: longText } })
    })

    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })

    await vi.waitFor(() => {
      expect(screen.getByTestId('description-error')).toBeTruthy()
    })
  })
})

describe('ProjectModal — display_name validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows error when display_name exceeds 150 characters', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByTestId('display_name'), 'a'.repeat(151))

    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })

    await vi.waitFor(() => {
      expect(screen.getByTestId('display_name-error')).toBeTruthy()
    })
  })
})

describe('ProjectModal — chargeback switch removed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFeatureFlagMock.mockReturnValue([false, true])
    Object.assign(userStore, { user: { isAdmin: false, isMaintainer: false } })
  })

  it('never renders the chargeback switch when feature flag is disabled (even for admin)', () => {
    useFeatureFlagMock.mockReturnValue([false, true])
    Object.assign(userStore, { user: { isAdmin: true, isMaintainer: true } })

    renderModal()

    expect(screen.queryByTestId('switch-chargeback_enabled')).toBeNull()
  })

  it('never renders the chargeback switch when feature flag is enabled but user is not admin', () => {
    useFeatureFlagMock.mockReturnValue([true, true])
    Object.assign(userStore, { user: { isAdmin: false, isMaintainer: false } })

    renderModal()

    expect(screen.queryByTestId('switch-chargeback_enabled')).toBeNull()
  })

  it('never renders the chargeback switch when feature flag is enabled and user is admin', () => {
    useFeatureFlagMock.mockReturnValue([true, true])
    Object.assign(userStore, { user: { isAdmin: true, isMaintainer: true } })

    renderModal()

    expect(screen.queryByTestId('switch-chargeback_enabled')).toBeNull()
  })
})

describe('ProjectModal — cost center removal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFeatureFlagMock.mockReturnValue([true, true])
    userStoreMock.user.isAdmin = true
  })

  afterEach(() => {
    useFeatureFlagMock.mockReturnValue([false, true])
    userStoreMock.user.isAdmin = false
  })

  it('removes a linked cost center and submits clear_cost_center in edit mode', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderModal({
      project: {
        id: 'proj-1',
        name: 'existing-project',
        display_name: 'Existing Project',
        description: 'desc',
        project_type: 'shared',
        user_count: 2,
        admin_count: 1,
        cost_center_id: 'cc-1',
        cost_center_name: 'eng-ops',
      } as any,
    })

    // The cost-center picker exposes a clear (×) affordance for the linked value.
    const clearButton = screen.getByTestId('cost_center_id-clear')
    await user.click(clearButton)

    await act(async () => {
      screen.getByRole('button', { name: 'Submit' }).click()
    })

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          cost_center_id: null,
          clear_cost_center: true,
        })
      )
    })
  })
})

// ─── CLI analytics toggle (EPMCDME-16025) ──────────────────────────────────────

const CLI_SWITCH = 'switch-cli_analytics_enabled'
const CLI_INPUT = 'switch-input-cli_analytics_enabled'
const READ_ONLY_TOOLTIP = 'Only Global Administrators and Maintainers can change this setting'

const cliProject = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'proj-1',
    name: 'existing-project',
    display_name: 'Existing Project',
    description: 'desc',
    project_type: 'shared',
    user_count: 2,
    admin_count: 1,
    cli_analytics_enabled: true,
    ...overrides,
  } as any)

const setUser = (user: Record<string, unknown>) => Object.assign(userStore, { user })

describe('ProjectModal — CLI analytics toggle render (EPMCDME-16025)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFeatureFlagMock.mockReturnValue([false, true])
  })

  afterEach(() => {
    setUser({ isAdmin: false, isMaintainer: false })
  })

  it('M1 renders an enabled toggle reflecting the project value for a Global Administrator', () => {
    setUser({ isAdmin: true, isMaintainer: false })
    renderModal({ project: cliProject({ cli_analytics_enabled: true }) })

    expect(screen.getByTestId(CLI_SWITCH)).toBeTruthy()
    const input = screen.getByTestId<HTMLInputElement>(CLI_INPUT)
    expect(input.disabled).toBe(false)
    expect(input.checked).toBe(true)
    expect(document.querySelector(`[data-tooltip-content="${READ_ONLY_TOOLTIP}"]`)).toBeNull()
  })

  it('M2 renders an enabled toggle without a read-only tooltip for a Maintainer who is not a Global Administrator', () => {
    setUser({ isAdmin: false, isMaintainer: true })
    renderModal({ project: cliProject({ cli_analytics_enabled: false }) })

    const input = screen.getByTestId<HTMLInputElement>(CLI_INPUT)
    expect(input.disabled).toBe(false)
    expect(input.checked).toBe(false)
    expect(document.querySelector(`[data-tooltip-content="${READ_ONLY_TOOLTIP}"]`)).toBeNull()
  })

  it('M3 renders a disabled toggle with the value and a tooltip for a Project Admin of this project', () => {
    setUser({ isAdmin: false, isMaintainer: false, applicationsAdmin: ['existing-project'] })
    renderModal({ project: cliProject({ cli_analytics_enabled: true }) })

    const input = screen.getByTestId<HTMLInputElement>(CLI_INPUT)
    expect(input.disabled).toBe(true)
    expect(input.checked).toBe(true)
    expect(document.querySelector(`[data-tooltip-content="${READ_ONLY_TOOLTIP}"]`)).not.toBeNull()
  })

  it.each([
    ['Project Admin of another project', { applicationsAdmin: ['other-project'] }],
    ['Member', {}],
    ['Auditor', { isAuditor: true }],
  ])('M4 renders nothing for a %s when the key is absent', (_role, flags) => {
    setUser({ isAdmin: false, isMaintainer: false, ...flags })
    renderModal({ project: cliProject({ cli_analytics_enabled: undefined }) })

    expect(screen.queryByTestId(CLI_SWITCH)).toBeNull()
  })

  it('M5 renders no toggle for a writer on a personal project', () => {
    setUser({ isAdmin: true, isMaintainer: true })
    renderModal({ project: cliProject({ project_type: 'personal', cli_analytics_enabled: false }) })

    expect(screen.queryByTestId(CLI_SWITCH)).toBeNull()
  })

  it('M6 renders no toggle in create mode, even for a writer', () => {
    setUser({ isAdmin: true, isMaintainer: true })
    renderModal({ project: null })

    expect(screen.queryByTestId(CLI_SWITCH)).toBeNull()
  })
})

describe('ProjectModal — CLI analytics payload (EPMCDME-16025)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFeatureFlagMock.mockReturnValue([false, true])
  })

  afterEach(() => {
    setUser({ isAdmin: false, isMaintainer: false })
  })

  const submit = async () => {
    await act(async () => {
      screen.getByRole('button', { name: /submit/i }).click()
    })
  }

  const submittedPayload = async (onSubmit: ReturnType<typeof vi.fn>) => {
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    return onSubmit.mock.calls[0][0]
  }

  it.each([
    ['Global Administrator', { isAdmin: true, isMaintainer: false }],
    ['Maintainer', { isAdmin: false, isMaintainer: true }],
  ])('S1 omits the key when a %s saves other fields without touching the toggle', async (_r, u) => {
    setUser(u)
    const user = userEvent.setup()
    const { onSubmit } = renderModal({ project: cliProject({ cli_analytics_enabled: true }) })

    await user.type(screen.getByTestId('description'), ' more')
    await submit()

    const payload = await submittedPayload(onSubmit)
    expect(payload.cli_analytics_enabled).toBeUndefined()
  })

  it.each([
    ['Global Administrator', false, true, { isAdmin: true, isMaintainer: false }],
    ['Global Administrator', true, false, { isAdmin: true, isMaintainer: false }],
    ['Maintainer', false, true, { isAdmin: false, isMaintainer: true }],
    ['Maintainer', true, false, { isAdmin: false, isMaintainer: true }],
  ])('S2 sends the new value when a %s changes the toggle %s -> %s', async (_r, from, to, u) => {
    setUser(u)
    const user = userEvent.setup()
    const { onSubmit } = renderModal({ project: cliProject({ cli_analytics_enabled: from }) })

    await user.click(screen.getByTestId(CLI_INPUT))
    await submit()

    const payload = await submittedPayload(onSubmit)
    expect(payload.cli_analytics_enabled).toBe(to)
  })

  it('S3 omits the key when a Project Admin of this project saves other fields', async () => {
    setUser({ isAdmin: false, isMaintainer: false, applicationsAdmin: ['existing-project'] })
    const user = userEvent.setup()
    const { onSubmit } = renderModal({ project: cliProject({ cli_analytics_enabled: true }) })

    await user.type(screen.getByTestId('description'), ' more')
    await submit()

    const payload = await submittedPayload(onSubmit)
    expect(payload.cli_analytics_enabled).toBeUndefined()
  })

  it('S4 cannot change the value as a Project Admin: the toggle is disabled and the payload has no key', async () => {
    setUser({ isAdmin: false, isMaintainer: false, applicationsAdmin: ['existing-project'] })
    const user = userEvent.setup()
    const { onSubmit } = renderModal({ project: cliProject({ cli_analytics_enabled: false }) })

    await user.click(screen.getByTestId(CLI_INPUT))
    await user.type(screen.getByTestId('description'), ' more')
    await submit()

    const payload = await submittedPayload(onSubmit)
    expect(screen.getByTestId<HTMLInputElement>(CLI_INPUT).checked).toBe(false)
    expect(payload.cli_analytics_enabled).toBeUndefined()
  })

  it.each([
    ['Project Admin of another project', { applicationsAdmin: ['other-project'] }],
    ['Member', {}],
    ['Auditor', { isAuditor: true }],
  ])('S3 omits the key for a %s when the project carries no key', async (_role, flags) => {
    setUser({ isAdmin: false, isMaintainer: false, ...flags })
    const user = userEvent.setup()
    const { onSubmit } = renderModal({ project: cliProject({ cli_analytics_enabled: undefined }) })

    await user.type(screen.getByTestId('description'), ' more')
    await submit()

    const payload = await submittedPayload(onSubmit)
    expect(payload.cli_analytics_enabled).toBeUndefined()
  })

  it('S5 omits the key when a writer toggles on and then back off', async () => {
    setUser({ isAdmin: true, isMaintainer: false })
    const user = userEvent.setup()
    const { onSubmit } = renderModal({ project: cliProject({ cli_analytics_enabled: false }) })

    await user.click(screen.getByTestId(CLI_INPUT))
    await user.click(screen.getByTestId(CLI_INPUT))
    await user.type(screen.getByTestId('description'), ' more')
    await submit()

    const payload = await submittedPayload(onSubmit)
    expect(payload.cli_analytics_enabled).toBeUndefined()
  })

  it('C1 sends undefined in create mode, even for a writer', async () => {
    setUser({ isAdmin: true, isMaintainer: true })
    const user = userEvent.setup()
    const { onSubmit } = renderModal({ project: null })

    await user.type(screen.getByTestId('name'), 'brand-new')
    await submit()

    const payload = await submittedPayload(onSubmit)
    expect(payload.cli_analytics_enabled).toBeUndefined()
  })

  it('omits the key for a writer on a personal project even if the form value were changed', async () => {
    setUser({ isAdmin: true, isMaintainer: true })
    const user = userEvent.setup()
    const { onSubmit } = renderModal({
      project: cliProject({ project_type: 'personal', cli_analytics_enabled: false }),
    })

    await user.type(screen.getByTestId('description'), ' more')
    await submit()

    const payload = await submittedPayload(onSubmit)
    expect(payload.cli_analytics_enabled).toBeUndefined()
  })
})
