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

describe('ProjectModal — auto-slug from display_name', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auto-fills name from display_name as user types', async () => {
    const user = userEvent.setup()
    renderModal()

    const displayNameInput = screen.getByTestId('display_name')
    await user.type(displayNameInput, 'My Team Project')

    expect(screen.getByTestId<HTMLInputElement>('name').value).toBe('my-team-project')
  })

  it('converts spaces to dashes and lowercases', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByTestId('display_name'), 'Hello World')
    expect(screen.getByTestId<HTMLInputElement>('name').value).toBe('hello-world')
  })

  it('strips special characters', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByTestId('display_name'), 'Team (Alpha)')
    expect(screen.getByTestId<HTMLInputElement>('name').value).toBe('team-alpha')
  })

  it('freezes name when user manually edits it', async () => {
    const user = userEvent.setup()
    renderModal()

    // Type into display_name to trigger auto-slug
    await user.type(screen.getByTestId('display_name'), 'My Team')

    // Manually clear and type a different name
    const nameInput = screen.getByTestId('name')
    await user.clear(nameInput)
    await user.type(nameInput, 'custom-name')

    // Further display_name changes should NOT update name
    await user.type(screen.getByTestId('display_name'), ' Extra')
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

  it('submits display_name as null when left empty', async () => {
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
          display_name: null,
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
