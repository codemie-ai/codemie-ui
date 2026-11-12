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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { submitHostedLaunch, validateHostedLaunch } from '@/utils/hostedApplicationLaunch'

const ui = 'https://codemie.example.com'
const origin = 'https://v-fbe4b0a1a7084f5e83becc8f93178183.codemie-content.net'

function response(changes = {}) {
  return {
    version_id: 'fbe4b0a1-a708-4f5e-83be-cc8f93178183',
    content_origin: origin,
    action: origin + '/_platform/launch',
    ticket: 'a'.repeat(43),
    ...changes,
  }
}

describe('hosted launch destination', () => {
  it('sends the ticket to the content origin the server named', () => {
    expect(validateHostedLaunch(response(), ui)).toEqual({
      action: origin + '/_platform/launch',
      ticket: 'a'.repeat(43),
      origin,
    })
  })

  it.each([
    [
      'another host naming',
      {
        content_origin: 'https://app-1.content.example',
        action: 'https://app-1.content.example/_platform/launch',
      },
    ],
    [
      'another port',
      { content_origin: origin + ':8443', action: origin + ':8443/_platform/launch' },
    ],
    ['another ticket format', { ticket: 'opaque-ticket' }],
    ['another bootstrap path', { action: origin + '/launch' }],
  ])('keeps working when the server changes %s', (_change, changes) => {
    expect(() => validateHostedLaunch(response(changes), ui)).not.toThrow()
  })

  it('allows plain HTTP only for local development hosts', () => {
    const local = 'http://v-fbe4b0a1a7084f5e83becc8f93178183.apps.localhost:8080'
    const launch = response({ content_origin: local, action: local + '/_platform/launch' })
    expect(validateHostedLaunch(launch, 'http://localhost:5173').origin).toBe(local)
    const plain = 'http://content.example'
    expect(() =>
      validateHostedLaunch(
        response({ content_origin: plain, action: plain + '/_platform/launch' }),
        ui
      )
    ).toThrow('could not be verified')
  })

  it.each([
    ['an action on another origin', { action: 'https://attacker.test/_platform/launch' }],
    [
      'a content origin on the CodeMie host',
      { content_origin: ui, action: ui + '/_platform/launch' },
    ],
    ['the CodeMie host on another port', { content_origin: ui + ':8443', action: ui + ':8443/x' }],
    ['an unreadable content origin', { content_origin: 'not a url' }],
    ['a missing action', { action: undefined }],
    ['an empty ticket', { ticket: '' }],
  ])('refuses %s', (_case, changes) => {
    expect(() => validateHostedLaunch(response(changes), ui)).toThrow('could not be verified')
  })
})

describe('submitHostedLaunch', () => {
  const launch = { origin, action: origin + '/_platform/launch', ticket: 'ticket-value' }
  const target = 'codemie-hosted-' + 'e'.repeat(32)
  afterEach(() => vi.restoreAllMocks())

  it('posts only the ticket to the launch action in the named frame, then removes the form', () => {
    const seen: Array<Record<string, unknown>> = []
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (
      this: HTMLFormElement
    ) {
      const inputs = [...this.elements] as HTMLInputElement[]
      seen.push({
        method: this.method,
        action: this.action,
        target: this.target,
        attached: document.body.contains(this),
        inputs: inputs.map((input) => ({ type: input.type, name: input.name, value: input.value })),
      })
    })
    submitHostedLaunch(launch, target)
    expect(seen).toEqual([
      {
        method: 'post',
        action: launch.action,
        target,
        attached: true,
        inputs: [{ type: 'hidden', name: 'ticket', value: 'ticket-value' }],
      },
    ])
    expect(document.querySelector('form')).toBeNull()
  })

  it('removes the form even when submitting throws', () => {
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => submitHostedLaunch(launch, '_self')).toThrow('blocked')
    expect(document.querySelector('form')).toBeNull()
  })
})
