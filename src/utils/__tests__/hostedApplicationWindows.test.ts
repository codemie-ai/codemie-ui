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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HOSTED_MESSAGE } from '@/utils/hostedApplicationMessages'
import {
  createHostedWindowOpener,
  HOSTED_OPENS_PER_MINUTE,
  isHostedPath,
} from '@/utils/hostedApplicationWindows'

const APP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const VERSION = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const VIEW = '/apps/' + APP + '/view'
const PREVIEW = '/apps/' + APP + '/preview/' + VERSION

const fakeWindow = (href = 'about:blank') => ({
  closed: false,
  focus: vi.fn(),
  location: { href },
})

const request = (target: unknown, name: unknown = '') => ({
  type: HOSTED_MESSAGE.open,
  target,
  name,
})

let now = 0
// A fresh name per test: the window registry is shared by every viewer of the page.
let unique = 0
const named = (label: string) => {
  unique += 1
  return label + '-' + unique
}

beforeEach(() => {
  now += 10 * 60 * 1000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('isHostedPath', () => {
  it.each([
    '/',
    '/deck.html?presenter=1',
    '/deck.html?presenter=1#/3',
    '/caf%C3%A9.html',
    // The backend alone decides what it serves; these only have the right shape.
    '/_platform/view',
    '/a/../b',
    '/a%2Fb',
    '/' + 'a'.repeat(4095),
  ])('accepts the shape of %s', (path) => {
    expect(isHostedPath(path)).toBe(true)
  })

  it.each([
    ['a protocol-relative host', '//evil.com'],
    ['a backslash', '/\\evil.com'],
    ['a javascript: URL', ['javascript', 'alert(1)'].join(':')],
    ['an absolute URL', 'https://evil.com/'],
    ['a relative path', 'deck.html'],
    ['an empty string', ''],
    ['an over-long path', '/' + 'a'.repeat(4096)],
    ['a newline', '/deck\n.html'],
    ['a DEL', '/deck\u007f'],
    ['a space', '/a b'],
    ['a non-ASCII character', '/café.html'],
    ['a number', 1],
    ['null', null],
  ])('rejects %s', (_label, path) => {
    expect(isHostedPath(path)).toBe(false)
  })
})

describe('createHostedWindowOpener', () => {
  it('opens the published view pinned to the launched version, under the router base', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
    const name = named('presenter')
    createHostedWindowOpener(APP, VIEW, VERSION)(request('/deck.html?presenter=1&x=a%20b#s2', name))
    expect(open).toHaveBeenCalledExactlyOnceWith(
      window.location.origin +
        VIEW +
        '?version=' +
        VERSION +
        '&path=%2Fdeck.html%3Fpresenter%3D1%26x%3Da%2520b%23s2',
      'codemie-app-' + APP + '-' + name
    )
  })

  it('opens a preview on its own route, with no version to pin', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
    createHostedWindowOpener(APP, PREVIEW, null)(request('/print'))
    expect(open).toHaveBeenCalledExactlyOnceWith(
      window.location.origin + PREVIEW + '?path=%2Fprint',
      '_blank'
    )
  })

  it('keeps the protocol CodeMie is reached on, even plain http in a production build', () => {
    vi.stubEnv('MODE', 'production')
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
    createHostedWindowOpener(APP, PREVIEW, null)(request('/print'))
    const [url] = open.mock.calls[0]
    expect(window.location.protocol).toBe('http:')
    expect(new URL(url as string).origin).toBe(window.location.origin)
  })

  it('keeps the router base path of a sub-path deployment', () => {
    vi.stubEnv('VITE_SUFFIX', '/codemie')
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
    createHostedWindowOpener(APP, PREVIEW, null)(request('/print'))
    const [url] = open.mock.calls[0]
    expect(new URL(url as string).pathname).toBe('/codemie' + PREVIEW)
  })

  it('reuses a named window of a sub-path deployment without reloading it', () => {
    vi.stubEnv('VITE_SUFFIX', '/codemie')
    const popup = fakeWindow()
    const open = vi.spyOn(window, 'open').mockReturnValue(popup as never)
    const opener = createHostedWindowOpener(APP, PREVIEW, null)
    const name = named('presenter')
    opener(request('/deck', name))
    popup.location.href = window.location.origin + '/codemie' + PREVIEW + '?path=%2Fdeck'
    opener(request('/deck', name))
    expect(open).toHaveBeenCalledTimes(1)
    expect(popup.focus).toHaveBeenCalledTimes(1)
  })

  it.each(['', '_blank', '_self', '_parent', '_top', '_BLANK', '_anything'])(
    'opens a new unnamed window every time for the name %j',
    (name) => {
      const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      opener(request('/print', name))
      now += 60 * 1000
      opener(request('/print', name))
      expect(open).toHaveBeenCalledTimes(2)
      expect(open.mock.calls.map(([, target]) => target)).toEqual(['_blank', '_blank'])
    }
  )

  it.each([
    ['a target with the wrong shape', request('//evil.com', 'x')],
    ['a target that is not a string', request(42, 'x')],
    ['a missing name', { type: HOSTED_MESSAGE.open, target: '/deck' }],
    ['an over-long name', request('/deck', 'n'.repeat(201))],
    ['another message kind', { type: HOSTED_MESSAGE.ready, target: '/deck', name: 'x' }],
    ['no message at all', null],
  ])('ignores %s', (_label, data) => {
    const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
    createHostedWindowOpener(APP, PREVIEW, null)(data)
    expect(open).not.toHaveBeenCalled()
  })

  describe('reusing a named window', () => {
    it('focuses the open window and leaves it alone on the same address', () => {
      const popup = fakeWindow()
      const open = vi.spyOn(window, 'open').mockReturnValue(popup as never)
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      const name = named('presenter')
      opener(request('/deck?presenter=1', name))
      popup.location.href = open.mock.calls[0][0] as string
      opener(request('/deck?presenter=1', name))
      expect(open).toHaveBeenCalledTimes(1)
      expect(popup.focus).toHaveBeenCalledTimes(1)
    })

    it('lets the browser move the named window to a new address, then focuses it', () => {
      const popup = fakeWindow()
      const open = vi.spyOn(window, 'open').mockReturnValue(popup as never)
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      const name = named('panel')
      opener(request('/one', name))
      popup.location.href = open.mock.calls[0][0] as string
      now += 60 * 1000
      opener(request('/two', name))
      expect(open).toHaveBeenCalledTimes(2)
      expect(open).toHaveBeenLastCalledWith(
        window.location.origin + PREVIEW + '?path=%2Ftwo',
        'codemie-app-' + APP + '-' + name
      )
      expect(popup.focus).toHaveBeenCalledTimes(1)
    })

    it('still reaches a named window that went to another origin, such as a sign-in page', () => {
      const popup = {
        closed: false,
        focus: vi.fn(),
        get location(): { href: string } {
          throw new DOMException('Blocked a frame with origin', 'SecurityError')
        },
      }
      const open = vi.spyOn(window, 'open').mockReturnValue(popup as never)
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      const name = named('presenter')
      opener(request('/deck', name))
      now += 60 * 1000
      expect(() => opener(request('/deck', name))).not.toThrow()
      expect(open).toHaveBeenCalledTimes(2)
      expect(open.mock.calls[1][1]).toBe('codemie-app-' + APP + '-' + name)
      expect(popup.focus).toHaveBeenCalledTimes(1)
    })

    it('opens the name again once its window was closed', () => {
      const first = fakeWindow()
      const open = vi
        .spyOn(window, 'open')
        .mockReturnValueOnce(first as never)
        .mockReturnValueOnce(fakeWindow() as never)
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      const name = named('presenter')
      opener(request('/deck', name))
      first.closed = true
      now += 60 * 1000
      opener(request('/deck', name))
      expect(open).toHaveBeenCalledTimes(2)
      expect(first.focus).not.toHaveBeenCalled()
    })

    it('keeps the same name apart for two applications', () => {
      const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
      const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      const name = named('presenter')
      createHostedWindowOpener(APP, PREVIEW, null)(request('/deck', name))
      createHostedWindowOpener(other, '/apps/' + other + '/view', VERSION)(request('/deck', name))
      expect(open).toHaveBeenCalledTimes(2)
      expect(open.mock.calls[1][1]).toBe('codemie-app-' + other + '-' + name)
    })
  })

  describe('bounding how many windows an application opens', () => {
    it('opens nothing once the click that asked for it is no longer active', () => {
      vi.stubGlobal('navigator', { ...navigator, userActivation: { isActive: false } })
      const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
      createHostedWindowOpener(APP, PREVIEW, null)(request('/deck'))
      expect(open).not.toHaveBeenCalled()
    })

    it('opens while the click is active', () => {
      vi.stubGlobal('navigator', { ...navigator, userActivation: { isActive: true } })
      const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
      createHostedWindowOpener(APP, PREVIEW, null)(request('/deck'))
      expect(open).toHaveBeenCalledTimes(1)
    })

    it('opens one window for one click, however many the application asks for', () => {
      // Opening a window uses up the click, as the browser does.
      const activation = { isActive: true }
      vi.stubGlobal('navigator', { ...navigator, userActivation: activation })
      const open = vi.spyOn(window, 'open').mockImplementation(() => {
        activation.isActive = false
        return fakeWindow() as never
      })
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      for (let i = 0; i < 20; i += 1) opener(request('/deck/' + i))
      expect(open).toHaveBeenCalledTimes(1)
    })

    it("opens every one of a person's quick clicks", () => {
      vi.stubGlobal('navigator', { ...navigator, userActivation: { isActive: true } })
      const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      for (let i = 0; i < 10; i += 1) {
        now += 200
        opener(request('/deck/' + i))
      }
      expect(open).toHaveBeenCalledTimes(10)
    })

    it('opens at most a cap of windows a minute where the browser does not report clicks', () => {
      vi.stubGlobal('navigator', { ...navigator, userActivation: undefined })
      const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      for (let i = 0; i < HOSTED_OPENS_PER_MINUTE + 3; i += 1) {
        now += 100
        opener(request('/deck/' + i))
      }
      expect(open).toHaveBeenCalledTimes(HOSTED_OPENS_PER_MINUTE)
      now += 60 * 1000
      opener(request('/later'))
      expect(open).toHaveBeenCalledTimes(HOSTED_OPENS_PER_MINUTE + 1)
    })

    it('counts the limit per viewer', () => {
      const open = vi.spyOn(window, 'open').mockReturnValue(fakeWindow() as never)
      createHostedWindowOpener(APP, PREVIEW, null)(request('/deck'))
      createHostedWindowOpener(APP, PREVIEW, null)(request('/deck'))
      expect(open).toHaveBeenCalledTimes(2)
    })

    it('does not count focusing a window that already shows the address', () => {
      const popup = fakeWindow()
      const open = vi.spyOn(window, 'open').mockReturnValue(popup as never)
      const opener = createHostedWindowOpener(APP, PREVIEW, null)
      const name = named('presenter')
      opener(request('/deck', name))
      popup.location.href = open.mock.calls[0][0] as string
      for (let i = 0; i < HOSTED_OPENS_PER_MINUTE + 2; i += 1) opener(request('/deck', name))
      expect(popup.focus).toHaveBeenCalledTimes(HOSTED_OPENS_PER_MINUTE + 2)
    })
  })
})
