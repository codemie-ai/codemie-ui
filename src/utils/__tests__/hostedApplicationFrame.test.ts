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
import { expect, it, vi } from 'vitest'

import { createHostedFrame } from '@/utils/hostedApplicationFrame'
import { submitHostedLaunch } from '@/utils/hostedApplicationLaunch'
import { HOSTED_MESSAGE } from '@/utils/hostedApplicationMessages'

const origin = 'https://v-' + 'a'.repeat(32) + '.codemie-content.net'
const launch = { origin, action: origin + '/_platform/launch', ticket: 'SECRET-NEVER-IN-FRAME' }
const ui = 'https://codemie.example.com'
it('pins a trusted container to one version and never embeds the launch credential', () => {
  const frame = createHostedFrame(launch, 'https://codemie.example.com')
  const parsed = new DOMParser().parseFromString(frame.document, 'text/html')
  expect(frame.target).toMatch(/^codemie-hosted-[a-f0-9]{32}$/)
  expect(frame.document).not.toContain(launch.ticket)
  expect(
    parsed.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')
  ).toContain('frame-src ' + origin)
  const sandbox = parsed.querySelector('iframe')?.getAttribute('sandbox') ?? ''
  expect(sandbox).toBe('allow-scripts allow-same-origin allow-popups')
  expect(sandbox).not.toContain('escape-sandbox')
  expect(parsed.querySelector('iframe')?.name).toBe(frame.target)
  expect(parsed.querySelector('iframe')?.getAttribute('tabindex')).toBe('0')
  const allow = parsed.querySelector('iframe')?.getAttribute('allow') ?? ''
  expect(allow.split(';').map((s) => s.trim())).toEqual([
    "camera 'none'",
    "microphone 'none'",
    "geolocation 'none'",
    "payment 'none'",
    "usb 'none'",
    'fullscreen ' + origin,
  ])
  expect(frame.document).toContain('event.source!==child.contentWindow')
  expect(frame.document).toContain('event.origin!==' + JSON.stringify(origin))
  expect(frame.document.indexOf('Content-Security-Policy')).toBeLessThan(
    frame.document.indexOf('<iframe')
  )
})
it.each([
  'https://attacker.test',
  origin + '/?x=1',
  origin + '/<script>',
  'https://user@' + new URL(origin).host,
])('rejects unsafe origins %s', (origin) => {
  expect(() => createHostedFrame({ ...launch, origin }, 'https://codemie.example.com')).toThrow()
})
it('accepts any version host naming but never the CodeMie host itself', () => {
  const other = 'https://app-1.content.example'
  expect(() =>
    createHostedFrame({ ...launch, origin: other, action: other + '/_platform/launch' }, ui)
  ).not.toThrow()
  const same = 'https://codemie.example.com:8443'
  expect(() =>
    createHostedFrame({ ...launch, origin: same, action: same + '/_platform/launch' }, ui)
  ).toThrow()
})
it('does not permit arbitrary named targets or top-level escape targets', () => {
  expect(() => submitHostedLaunch(launch, '_top')).toThrow()
  expect(() => submitHostedLaunch(launch, 'existing-admin-tab')).toThrow()
})
it.each([
  'https://a_b.content.example',
  'https://content.example"><script>alert(1)</script>',
  "https://content.example'onload='x",
  'https://content.example<x>',
])('refuses an origin outside the strict host allowlist: %s', (unsafe) => {
  expect(() =>
    createHostedFrame({ ...launch, origin: unsafe, action: unsafe + '/_platform/launch' }, ui)
  ).toThrow()
})
it('refuses a CodeMie origin outside the strict host allowlist', () => {
  expect(() => createHostedFrame(launch, 'https://codemie_ui.example.com')).toThrow()
})

/** Runs the container's own script against a fake child frame and parent, returning what it relays. */
function relay(data: unknown, from: { source?: 'child' | 'other'; origin?: string } = {}) {
  const frame = createHostedFrame(launch, ui)
  const script = new DOMParser()
    .parseFromString(frame.document, 'text/html')
    .querySelector('script')!.textContent!
  const child = { contentWindow: {} }
  const parent = { postMessage: vi.fn() }
  let listener: (event: unknown) => void = () => undefined
  // The container's fixed script, run against fakes; it is produced by createHostedFrame above.
  // eslint-disable-next-line no-new-func
  new Function('document', 'addEventListener', 'parent', script)(
    { querySelector: () => child },
    (_type: string, handler: typeof listener) => {
      listener = handler
    },
    parent
  )
  listener({
    data,
    source: from.source === 'other' ? {} : child.contentWindow,
    origin: from.origin ?? origin,
  })
  return parent.postMessage
}
it('relays a request to open a window from the content to CodeMie, with only its fields', () => {
  const posted = relay({
    type: HOSTED_MESSAGE.open,
    target: '/deck?presenter=1',
    name: 'presenter',
    extra: 'dropped',
  })
  expect(posted).toHaveBeenCalledExactlyOnceWith(
    { type: HOSTED_MESSAGE.open, target: '/deck?presenter=1', name: 'presenter' },
    ui
  )
})
it.each([
  ['another frame', { type: HOSTED_MESSAGE.open, target: '/x', name: '' }, { source: 'other' }],
  [
    'another origin',
    { type: HOSTED_MESSAGE.open, target: '/x', name: '' },
    { origin: 'https://attacker.test' },
  ],
  ['a target that is not a string', { type: HOSTED_MESSAGE.open, target: 1, name: '' }, {}],
  ['a name that is not a string', { type: HOSTED_MESSAGE.open, target: '/x' }, {}],
] as const)('does not relay an open request from %s', (_label, data, from) => {
  expect(relay(data, from)).not.toHaveBeenCalled()
})
it.each([HOSTED_MESSAGE.ready, HOSTED_MESSAGE.unavailable])(
  'relays the %s message kind from the shared message module',
  (type) => {
    expect(relay({ type, extra: 'dropped' })).toHaveBeenCalledExactlyOnceWith({ type }, ui)
  }
)
it.each([HOSTED_MESSAGE.location, 'codemie-hosted-other'])(
  'does not relay the %s message kind',
  (type) => {
    expect(relay({ type, target: '/x', name: '' })).not.toHaveBeenCalled()
  }
)
