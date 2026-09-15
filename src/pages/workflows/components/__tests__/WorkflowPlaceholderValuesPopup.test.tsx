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

import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent, { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import WorkflowPlaceholderValuesPopup from '../WorkflowPlaceholderValuesPopup'

vi.mock('@/components/Popup', async () => {
  const { useEffect, useRef } = await import('react')
  const PopupMock = ({
    visible,
    header,
    children,
    hideFooter,
    submitText,
    cancelText,
    submitDisabled,
    onSubmit,
    onHide,
  }: any) => {
    const prevVisible = useRef(visible)
    useEffect(() => {
      if (prevVisible.current && !visible) {
        onHide()
      }
      prevVisible.current = visible
    }, [visible, onHide])

    return visible ? (
      <div data-testid="placeholder-popup">
        <h1>{header}</h1>
        {children}
        {!hideFooter && (
          <div>
            <button type="button" onClick={onHide}>
              {cancelText ?? 'Cancel'}
            </button>
            <button type="button" onClick={onSubmit} disabled={submitDisabled}>
              {submitText ?? 'Create'}
            </button>
          </div>
        )}
      </div>
    ) : null
  }
  return { default: PopupMock }
})

vi.mock('@/hooks/useFocusOnVisible', () => ({
  useFocusOnVisible: vi.fn(),
}))

describe('WorkflowPlaceholderValuesPopup', () => {
  let user: UserEvent

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('renders when visible=true', () => {
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    expect(screen.getByTestId('placeholder-popup')).toBeInTheDocument()
  })

  it('does not render when visible=false', () => {
    render(
      <WorkflowPlaceholderValuesPopup
        visible={false}
        placeholders={['assistant_id']}
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    expect(screen.queryByTestId('placeholder-popup')).not.toBeInTheDocument()
  })

  it('renders one labeled input per placeholder', () => {
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id', 'datasource_id']}
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/assistant_id/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/datasource_id/i)).toBeInTheDocument()
  })

  it('calls onSubmit with entered values when Apply is clicked', async () => {
    const onSubmit = vi.fn()
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id', 'datasource_id']}
        onSubmit={onSubmit}
        onHide={vi.fn()}
      />
    )

    await user.type(screen.getByLabelText(/assistant_id/i), 'asst-001')
    await user.type(screen.getByLabelText(/datasource_id/i), 'ds-007')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(onSubmit).toHaveBeenCalledWith({ assistant_id: 'asst-001', datasource_id: 'ds-007' })
  })

  it('calls onSubmit with trimmed values when Apply is clicked', async () => {
    const onSubmit = vi.fn()
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id', 'datasource_id']}
        onSubmit={onSubmit}
        onHide={vi.fn()}
      />
    )

    await user.type(screen.getByLabelText(/assistant_id/i), '  asst-001  ')
    await user.type(screen.getByLabelText(/datasource_id/i), ' ds-007 ')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(onSubmit).toHaveBeenCalledWith({ assistant_id: 'asst-001', datasource_id: 'ds-007' })
  })

  it('keeps entered values when the parent leaves the popup open after Apply', async () => {
    const onSubmit = vi.fn()
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={onSubmit}
        onHide={vi.fn()}
      />
    )

    await user.type(screen.getByLabelText(/assistant_id/i), 'asst-001')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(onSubmit).toHaveBeenCalledWith({ assistant_id: 'asst-001' })
    expect(screen.getByLabelText(/assistant_id/i)).toHaveValue('asst-001')
  })

  it('shows "Required" error and does not call onSubmit when a field is empty on Apply', async () => {
    const onSubmit = vi.fn()
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={onSubmit}
        onHide={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText('Required')).toBeInTheDocument()
  })

  it('calls onHide and does not call onSubmit when Cancel is clicked', async () => {
    const onHide = vi.fn()
    const onSubmit = vi.fn()
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={onSubmit}
        onHide={onHide}
      />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onHide).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Apply button is present', () => {
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
  })

  it('resets fields when placeholders change while mounted', async () => {
    const { rerender } = render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    await user.type(screen.getByLabelText(/assistant_id/i), 'old')
    rerender(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['datasource_id']}
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    expect(screen.getByLabelText(/datasource_id/i)).toHaveValue('')
    expect(screen.queryByLabelText(/assistant_id/i)).not.toBeInTheDocument()
  })

  it('clears stale values when a shared key appears in a new placeholder set', async () => {
    const { rerender } = render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id', 'datasource_id']}
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    await user.type(screen.getByLabelText(/assistant_id/i), 'stale')
    // Rerender with a new set that still contains assistant_id but not datasource_id
    rerender(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    // useEffect must reset the shared key; without it, assistant_id would show 'stale'
    expect(screen.getByLabelText(/assistant_id/i)).toHaveValue('')
  })

  it('surfaces a parent materialize error in the dialog', () => {
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        error="assistant_id is required"
        onSubmit={vi.fn()}
        onHide={vi.fn()}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent('assistant_id is required')
  })

  it('disables Apply while onSubmit is in flight and does not fire a second submit', async () => {
    let resolveSubmit!: () => void
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        })
    )
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={onSubmit}
        onHide={vi.fn()}
      />
    )

    await user.type(screen.getByLabelText(/assistant_id/i), 'asst-001')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled()
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /apply/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)

    resolveSubmit()
    await waitFor(() => expect(screen.getByRole('button', { name: /apply/i })).toBeEnabled())
  })

  it('does not call onHide when the parent closes the popup after Apply', async () => {
    const onHide = vi.fn()
    const onSubmit = vi.fn()
    const { rerender } = render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={onSubmit}
        onHide={onHide}
      />
    )

    await user.type(screen.getByLabelText(/assistant_id/i), 'asst-001')
    await user.click(screen.getByRole('button', { name: /apply/i }))
    expect(onSubmit).toHaveBeenCalledWith({ assistant_id: 'asst-001' })

    rerender(
      <WorkflowPlaceholderValuesPopup
        visible={false}
        placeholders={['assistant_id']}
        onSubmit={onSubmit}
        onHide={onHide}
      />
    )

    await waitFor(() => expect(screen.queryByTestId('placeholder-popup')).not.toBeInTheDocument())
    expect(onHide).not.toHaveBeenCalled()
  })

  it('shows Required and does not call onSubmit when Apply is clicked with whitespace only', async () => {
    const onSubmit = vi.fn()
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={onSubmit}
        onHide={vi.fn()}
      />
    )

    await user.type(screen.getByLabelText(/assistant_id/i), '   ')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText('Required')).toBeInTheDocument()
  })

  it('re-enables Apply after a rejected submit so the user can retry', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('materialize failed'))
    render(
      <WorkflowPlaceholderValuesPopup
        visible={true}
        placeholders={['assistant_id']}
        onSubmit={onSubmit}
        onHide={vi.fn()}
      />
    )

    await user.type(screen.getByLabelText(/assistant_id/i), 'asst-001')
    await user.click(screen.getByRole('button', { name: /apply/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: /apply/i })).toBeEnabled())
    expect(onSubmit).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /apply/i }))
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })
})
