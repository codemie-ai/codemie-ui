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
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
  createInputRender,
  createMediaRender,
  withValidationMessage,
  type InputRenderProps,
} from '@/a2ui/factory'

// The factory render wrappers receive the props already resolved by the A2UI
// generic binder ({label, value, setValue, validationErrors, ...rest}) — these
// tests drive them in isolation, without a MessageProcessor.

describe('createInputRender', () => {
  const Probe = ({ label, value, setValue, validationErrors, rest }: InputRenderProps<string>) => (
    <div>
      <span data-testid="label">{label ?? '(none)'}</span>
      <span data-testid="value">{String(value)}</span>
      <span data-testid="errors">{validationErrors.join(',')}</span>
      <span data-testid="rest-variant">{String(rest.variant)}</span>
      <button onClick={() => setValue('typed')}>set</button>
    </div>
  )

  it('normalizes label, value, validationErrors and forwards the remaining props', () => {
    const Wrapped = createInputRender<string>(Probe)
    render(
      <Wrapped
        props={{
          label: 'Your name',
          value: 'Ada',
          validationErrors: ['Required'],
          variant: 'shortText',
        }}
      />
    )
    expect(screen.getByTestId('label')).toHaveTextContent('Your name')
    expect(screen.getByTestId('value')).toHaveTextContent('Ada')
    expect(screen.getByTestId('errors')).toHaveTextContent('Required')
    expect(screen.getByTestId('rest-variant')).toHaveTextContent('shortText')
  })

  it('forwards setValue from the binder', () => {
    const setValue = vi.fn()
    const Wrapped = createInputRender<string>(Probe)
    render(<Wrapped props={{ value: '', setValue }} />)
    screen.getByRole('button', { name: 'set' }).click()
    expect(setValue).toHaveBeenCalledWith('typed')
  })

  it('substitutes a no-op setValue when the binder provides none', () => {
    const Wrapped = createInputRender<string>(Probe)
    render(<Wrapped props={{ value: 'x' }} />)
    expect(() => screen.getByRole('button', { name: 'set' }).click()).not.toThrow()
  })
})

describe('createMediaRender', () => {
  const Media = ({ url }: { url: string }) => <img alt="media" src={url} />

  it('fires no request for an http(s) URL until the user asks for it', async () => {
    const Wrapped = createMediaRender(Media, 'Image')
    render(<Wrapped props={{ url: 'https://example.com/pic.png' }} />)

    // Agent-authored URLs are untrusted: nothing is fetched before an explicit click.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const consent = screen.getByTestId('a2ui-media-consent')
    expect(consent).toHaveTextContent('example.com')

    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/pic.png')
  })

  it('renders a safe placeholder (no media element) for a javascript: URL', () => {
    const Wrapped = createMediaRender(Media, 'Image')
    // eslint-disable-next-line no-script-url -- the hostile URL under test
    render(<Wrapped props={{ url: 'javascript:alert(1)' }} />) // NOSONAR - hostile input; the test asserts it is refused
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('a2ui-media-placeholder')).toBeInTheDocument()
  })

  it('renders a safe placeholder for data: and relative URLs', () => {
    const Wrapped = createMediaRender(Media, 'Video')
    const { rerender } = render(<Wrapped props={{ url: 'data:text/html,x' }} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    rerender(<Wrapped props={{ url: './relative.png' }} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('a2ui-media-placeholder')).toBeInTheDocument()
  })
})

describe('withValidationMessage', () => {
  const impl = (label: string) => ({ name: label, render: () => <span>{label}</span> }) as never

  const contextWith = (checks: unknown, pass: boolean) =>
    ({
      componentModel: { properties: { checks } },
      dataContext: { resolveDynamicValue: () => pass },
    }) as never

  const wrapped = () =>
    withValidationMessage(impl('picker')) as unknown as {
      render: (props: Record<string, unknown>) => React.ReactElement
    }

  const rule = [{ condition: { call: 'required', args: { value: { path: '/x' } } }, message: 'Pick one' }]

  it('prints the message of the check the field fails', () => {
    const Render = wrapped().render
    render(<Render context={contextWith(rule, false)} />)
    expect(screen.getByText('Pick one')).toBeInTheDocument()
    expect(screen.getByText('picker')).toBeInTheDocument()
  })

  it('stays out of the way when the check passes', () => {
    const Render = wrapped().render
    const { container } = render(<Render context={contextWith(rule, true)} />)
    expect(container.textContent).toBe('picker')
  })

  it('says nothing when the failed rule carries no message', () => {
    const Render = wrapped().render
    const { container } = render(
      <Render context={contextWith([{ condition: { call: 'required' } }], false)} />
    )
    expect(container.textContent).toBe('picker')
  })
})
