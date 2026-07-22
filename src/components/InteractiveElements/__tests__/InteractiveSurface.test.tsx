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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import InteractiveSurface from '@/components/InteractiveElements/InteractiveSurface'
import type { InteractiveRequest } from '@/types/entity/interactive'

// PrimeReact Dropdown / react-datepicker rely on portals & timers that are noisy
// in jsdom; swap them for minimal native controls so the surface's collection and
// validation wiring can be driven deterministically.
vi.mock('@/components/form/Select', () => ({
  default: ({
    id,
    options,
    onChangeValue,
    disabled,
    error,
  }: {
    id?: string
    options: { value: string; label: string }[]
    onChangeValue: (value: string) => void
    disabled?: boolean
    error?: string
  }) => (
    <div>
      <select data-testid={id} disabled={disabled} onChange={(e) => onChangeValue(e.target.value)}>
        <option value="">--</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <span>{error}</span> : null}
    </div>
  ),
}))

vi.mock('@/components/form/DatePicker', () => ({
  default: ({
    id,
    onChange,
    disabled,
    error,
  }: {
    id?: string
    onChange: (value: string | null) => void
    disabled?: boolean
    error?: string
  }) => (
    <div>
      <input data-testid={id} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      {error ? <span>{error}</span> : null}
    </div>
  ),
}))

const req = (surface: unknown): InteractiveRequest =>
  ({ request_id: 'r1', surface } as InteractiveRequest)

describe('InteractiveSurface — single combined submit', () => {
  it('submits an action button as one submit response with its action id', async () => {
    const onSubmit = vi.fn()
    const request = req([
      {
        type: 'row',
        children: [
          { type: 'button', id: 'approve', label: 'Approve' },
          { type: 'button', id: 'reject', label: 'Reject', style: 'danger' },
        ],
      },
    ])
    render(
      <InteractiveSurface
        request={request}
        disabled={false}
        submittedResponse={null}
        onSubmit={onSubmit}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      'submit',
      { action: 'approve', answers: {} },
      expect.stringContaining('Approve')
    )
  })

  it('single choice selects on click and submits only via Submit', async () => {
    const onSubmit = vi.fn()
    const request = req([
      {
        type: 'multiple_choice',
        id: 'db',
        max_allowed_selections: 1,
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
      },
    ])
    render(
      <InteractiveSurface
        request={request}
        disabled={false}
        submittedResponse={null}
        onSubmit={onSubmit}
      />
    )
    await userEvent.click(screen.getByRole('radio', { name: 'B' }))
    expect(onSubmit).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledWith(
      'submit',
      { action: null, answers: { db: { selected: ['b'] } } },
      expect.any(String)
    )
  })

  it('caps multi-choice and submits both selections in one response', async () => {
    const onSubmit = vi.fn()
    const request = req([
      {
        type: 'multiple_choice',
        id: 'feats',
        max_allowed_selections: 2,
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ],
      },
    ])
    render(
      <InteractiveSurface
        request={request}
        disabled={false}
        submittedResponse={null}
        onSubmit={onSubmit}
      />
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'A' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'B' }))
    expect(screen.getByRole('checkbox', { name: 'C' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledWith(
      'submit',
      { action: null, answers: { feats: { selected: ['a', 'b'] } } },
      expect.any(String)
    )
  })

  it('collects a whole mixed surface into ONE submit on the action button', async () => {
    const onSubmit = vi.fn()
    const request = req([
      {
        type: 'multiple_choice',
        id: 'db',
        max_allowed_selections: 1,
        options: [{ value: 'pg', label: 'PostgreSQL' }],
      },
      {
        type: 'multiple_choice',
        id: 'feats',
        max_allowed_selections: 2,
        options: [
          { value: 'auth', label: 'Auth' },
          { value: 'billing', label: 'Billing' },
        ],
      },
      {
        type: 'text_field',
        id: 'email',
        label: 'Email',
        validation: { required: true, email: true },
      },
      { type: 'button', id: 'approve', label: 'Approve' },
    ])
    render(
      <InteractiveSurface
        request={request}
        disabled={false}
        submittedResponse={null}
        onSubmit={onSubmit}
      />
    )
    await userEvent.click(screen.getByRole('radio', { name: 'PostgreSQL' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Auth' }))
    await userEvent.type(screen.getByLabelText(/Email/), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(
      'submit',
      {
        action: 'approve',
        answers: {
          db: { selected: ['pg'] },
          feats: { selected: ['auth'] },
          email: { value: 'a@b.co' },
        },
      },
      expect.any(String)
    )
  })

  it('blocks submit on invalid email and shows an error', async () => {
    const onSubmit = vi.fn()
    const request = req([
      {
        type: 'text_field',
        id: 'email',
        label: 'Email',
        validation: { required: true, email: true },
      },
      { type: 'button', id: 'send', label: 'Send' },
    ])
    render(
      <InteractiveSurface
        request={request}
        disabled={false}
        submittedResponse={null}
        onSubmit={onSubmit}
      />
    )
    await userEvent.type(screen.getByLabelText(/Email/), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument()
  })

  it('rejects a regex substring match (server fullmatch parity)', async () => {
    const onSubmit = vi.fn()
    const request = req([
      { type: 'text_field', id: 'code', label: 'Code', validation: { regex: '\\d{4}' } },
      { type: 'button', id: 'send', label: 'Send' },
    ])
    render(
      <InteractiveSurface
        request={request}
        disabled={false}
        submittedResponse={null}
        onSubmit={onSubmit}
      />
    )
    await userEvent.type(screen.getByLabelText(/Code/), 'abc1234xyz')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText(/required format/i)).toBeInTheDocument()
  })

  it('does not fire when disabled', async () => {
    const onSubmit = vi.fn()
    const request = req([{ type: 'button', id: 'ok', label: 'OK' }])
    render(
      <InteractiveSurface request={request} disabled submittedResponse={null} onSubmit={onSubmit} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders submitted state disabled with the chosen action marked', () => {
    const request = req([{ type: 'button', id: 'approve', label: 'Approve' }])
    render(
      <InteractiveSurface
        request={request}
        disabled
        submittedResponse={{
          request_id: 'r1',
          kind: 'submit',
          payload: { action: 'approve', answers: {} },
        }}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled()
    expect(screen.getByTestId('interactive-selected-approve')).toBeInTheDocument()
  })

  describe('dropdown and date picker', () => {
    it('submits a dropdown selection as a value answer in the combined payload', async () => {
      const onSubmit = vi.fn()
      const request = req([
        {
          type: 'dropdown',
          id: 'db',
          label: 'Database',
          options: [
            { value: 'postgresql', label: 'PostgreSQL' },
            { value: 'mysql', label: 'MySQL' },
          ],
        },
      ])
      render(
        <InteractiveSurface
          request={request}
          disabled={false}
          submittedResponse={null}
          onSubmit={onSubmit}
        />
      )
      await userEvent.selectOptions(screen.getByTestId('interactive-db'), 'mysql')
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onSubmit).toHaveBeenCalledWith(
        'submit',
        { action: null, answers: { db: { value: 'mysql' } } },
        expect.any(String)
      )
    })

    it('blocks submit when a required dropdown is empty', async () => {
      const onSubmit = vi.fn()
      const request = req([
        {
          type: 'dropdown',
          id: 'db',
          label: 'Database',
          required: true,
          options: [{ value: 'postgresql', label: 'PostgreSQL' }],
        },
        { type: 'button', id: 'ok', label: 'OK' },
      ])
      render(
        <InteractiveSurface
          request={request}
          disabled={false}
          submittedResponse={null}
          onSubmit={onSubmit}
        />
      )
      await userEvent.click(screen.getByRole('button', { name: 'OK' }))
      expect(onSubmit).not.toHaveBeenCalled()
      expect(await screen.findByText(/is required/i)).toBeInTheDocument()
    })

    it('submits a date picker value (ISO date) in the combined payload', async () => {
      const onSubmit = vi.fn()
      const request = req([{ type: 'date_picker', id: 'when', label: 'When' }])
      render(
        <InteractiveSurface
          request={request}
          disabled={false}
          submittedResponse={null}
          onSubmit={onSubmit}
        />
      )
      await userEvent.type(screen.getByTestId('interactive-when'), '2026-07-20')
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onSubmit).toHaveBeenCalledWith(
        'submit',
        { action: null, answers: { when: { value: '2026-07-20' } } },
        expect.any(String)
      )
    })

    it('blocks submit when a required date is empty', async () => {
      const onSubmit = vi.fn()
      const request = req([
        { type: 'date_picker', id: 'when', label: 'When', required: true },
        { type: 'button', id: 'ok', label: 'OK' },
      ])
      render(
        <InteractiveSurface
          request={request}
          disabled={false}
          submittedResponse={null}
          onSubmit={onSubmit}
        />
      )
      await userEvent.click(screen.getByRole('button', { name: 'OK' }))
      expect(onSubmit).not.toHaveBeenCalled()
      expect(await screen.findByText(/is required/i)).toBeInTheDocument()
    })
  })

  describe('re-answer (pre-filled, editable)', () => {
    const request = req([
      {
        type: 'multiple_choice',
        id: 'db',
        max_allowed_selections: 1,
        options: [
          { value: 'pg', label: 'PostgreSQL' },
          { value: 'my', label: 'MySQL' },
        ],
      },
    ])
    const prior = {
      request_id: 'r1',
      kind: 'submit' as const,
      payload: { action: null, answers: { db: { selected: ['pg'] } } },
    }

    it('seeds controls from the prior response and stays editable when active', async () => {
      const onSubmit = vi.fn()
      render(
        <InteractiveSurface
          request={request}
          disabled={false}
          submittedResponse={prior}
          onSubmit={onSubmit}
        />
      )
      // Pre-filled with the previous answer...
      expect(screen.getByRole('radio', { name: 'PostgreSQL' })).toBeChecked()
      // ...but editable: change the answer and re-submit.
      await userEvent.click(screen.getByRole('radio', { name: 'MySQL' }))
      await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onSubmit).toHaveBeenCalledWith(
        'submit',
        { action: null, answers: { db: { selected: ['my'] } } },
        expect.any(String)
      )
    })

    it('locks the pre-filled surface when disabled', () => {
      render(
        <InteractiveSurface
          request={request}
          disabled
          submittedResponse={prior}
          onSubmit={vi.fn()}
        />
      )
      expect(screen.getByRole('radio', { name: 'PostgreSQL' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'MySQL' })).toBeDisabled()
    })
  })

  it('does not run a catastrophic-backtracking regex on the client (defers to server)', async () => {
    const onSubmit = vi.fn()
    const request = req([
      { type: 'text_field', id: 'code', label: 'Code', validation: { regex: '(a+)+$' } },
      { type: 'button', id: 'send', label: 'Send' },
    ])
    render(
      <InteractiveSurface
        request={request}
        disabled={false}
        submittedResponse={null}
        onSubmit={onSubmit}
      />
    )
    // A value that would exponentially backtrack against (a+)+$ — the client must
    // skip the pattern (safeRegex returns null) and let the submit through so the
    // server (which has a real match timeout) is authoritative.
    await userEvent.type(screen.getByLabelText(/Code/), 'aaaaaaaaaaaaaaaaaaaaX')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  describe('submission summary (display text)', () => {
    it('builds a clean one-line summary without a leading check or double colon', async () => {
      const onSubmit = vi.fn()
      const request = req([
        { type: 'text_field', id: 'd', label: '✓ Дата:' },
        { type: 'button', id: 'send', label: 'Send' },
      ])
      render(
        <InteractiveSurface
          request={request}
          disabled={false}
          submittedResponse={null}
          onSubmit={onSubmit}
        />
      )
      await userEvent.type(screen.getByLabelText(/Дата/), '2026-07-20')
      await userEvent.click(screen.getByRole('button', { name: 'Send' }))
      const displayText = onSubmit.mock.calls[0][2] as string
      // The chip itself renders the check mark, so the text must not add one.
      expect(displayText.startsWith('✓')).toBe(false)
      expect(displayText).toBe('Дата: 2026-07-20')
      expect(displayText).not.toContain('::')
    })
  })

  describe('malformed-payload resilience', () => {
    it('does not crash when options are missing', () => {
      const bad = req([{ type: 'multiple_choice', id: 'c1', max_allowed_selections: 1 }])
      expect(() =>
        render(
          <InteractiveSurface
            request={bad}
            disabled={false}
            submittedResponse={null}
            onSubmit={vi.fn()}
          />
        )
      ).not.toThrow()
    })
    it('does not crash when surface is not an array', () => {
      const bad = req(undefined)
      expect(() =>
        render(
          <InteractiveSurface
            request={bad}
            disabled={false}
            submittedResponse={null}
            onSubmit={vi.fn()}
          />
        )
      ).not.toThrow()
    })
    it('does not crash when column children are missing', () => {
      const bad = req([{ type: 'column' }])
      expect(() =>
        render(
          <InteractiveSurface
            request={bad}
            disabled={false}
            submittedResponse={null}
            onSubmit={vi.fn()}
          />
        )
      ).not.toThrow()
    })
  })
})
