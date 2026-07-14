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

import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import ProjectModal from '../ProjectModal'

// ─── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/store/user', () => ({
  userStore: { user: { isAdmin: false, isMaintainer: false } },
}))

vi.mock('@/store/costCenters', () => ({
  costCentersStore: {
    getCostCenterOptions: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlag: () => [false, true],
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
  default: () => null,
}))

vi.mock('@/components/form/Autocomplete', () => ({
  default: () => null,
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
