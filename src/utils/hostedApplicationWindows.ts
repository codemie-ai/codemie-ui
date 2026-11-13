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

import {
  HOSTED_CHANNEL,
  HOSTED_MESSAGE,
  type HostedCloseRequest,
  type HostedOpenRequest,
} from '@/utils/hostedApplicationMessages'

/** Longest local page a hosted application may ask CodeMie to open: path, query and fragment. */
export const HOSTED_PATH_MAX = 4096

/** Longest window name a hosted application may give a window it asks CodeMie to open. */
export const HOSTED_WINDOW_NAME_MAX = 200

/** Query parameters of the viewer route that say where a new window starts. */
export const HOSTED_PATH_PARAM = 'path'
export const HOSTED_VERSION_PARAM = 'version'
export const HOSTED_OPENER_PARAM = 'opener'

/** A channel the content broker gave a window; also what `?opener=` must look like. */
export const isHostedChannel = (value: unknown): value is string =>
  typeof value === 'string' && HOSTED_CHANNEL.test(value)

// The window features a hosted application may set, each with its smallest value, in pixels.
const FEATURE_MIN = [
  ['width', 100],
  ['height', 100],
  ['left', 0],
  ['top', 0],
] as const
const FEATURE_MAX = 10000

/**
 * The `window.open` features for what the content asked: "popup" plus each integer size and position,
 * clamped to a sane range. A field of the wrong type is dropped; nothing left is "", which opens a tab.
 */
export const hostedWindowFeatures = (features: unknown): string => {
  if (!features || typeof features !== 'object') return ''
  const asked = features as Record<string, unknown>
  const fields = FEATURE_MIN.flatMap(([key, min]) => {
    const value = asked[key]
    return typeof value === 'number' && Number.isInteger(value)
      ? [key + '=' + Math.min(Math.max(value, min), FEATURE_MAX)]
      : []
  })
  return asked.popup === true || fields.length ? ['popup', ...fields].join(',') : ''
}

/**
 * Window opening is bounded on CodeMie's side as well as by the browser's pop-up blocker, because a
 * person may have allowed pop-ups for CodeMie and every window starts a full launch. A window opens
 * only while the click that asked for it is still active; opening one uses that click up, so one
 * click opens one window. Where the browser does not report clicks, the cap below is the only bound:
 * well above what a person clicks, so it never refuses a person's own clicks.
 */
export const HOSTED_OPENS_PER_MINUTE = 30
const MINUTE_MS = 60 * 1000

// Printable ASCII only (0x21-0x7E): no space, control or non-ASCII character.
const PRINTABLE_ASCII = /^[\x21-\x7e]*$/

/**
 * Only the shape needed to put the page into `?path=` safely: "/…" in printable ASCII, never "//host"
 * or a backslash. Whether the page can be served is the backend's decision; when it refuses one, the
 * viewer launches the application's root instead.
 */
export const isHostedPath = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= HOSTED_PATH_MAX &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  PRINTABLE_ASCII.test(value) &&
  !value.includes('\\')

const isOpenRequest = (data: unknown): data is HostedOpenRequest => {
  const request = data as Partial<HostedOpenRequest> | null
  return (
    request?.type === HOSTED_MESSAGE.open &&
    isHostedPath(request.target) &&
    typeof request.name === 'string' &&
    request.name.length <= HOSTED_WINDOW_NAME_MAX &&
    (request.channel === null || isHostedChannel(request.channel))
  )
}

const isCloseRequest = (data: unknown): data is HostedCloseRequest => {
  const request = data as Partial<HostedCloseRequest> | null
  return request?.type === HOSTED_MESSAGE.close && isHostedChannel(request.channel)
}

// An empty name, or one starting with "_" (the browsing-context keywords), always means a new window.
// The backend's content broker applies the same rule.
const isNewWindowName = (name: string) => name === '' || name.startsWith('_')

// Windows opened for hosted applications, by their per-application window name.
const opened = new Map<string, Window>()

// The router's base path of a sub-path deployment ("/codemie"), without a trailing slash.
const routerBase = () => {
  const suffix = import.meta.env.VITE_SUFFIX ?? ''
  let base = suffix && !suffix.startsWith('/') ? '/' + suffix : suffix
  while (base.endsWith('/')) base = base.slice(0, -1)
  return base
}

/**
 * The absolute address of a viewer window: this page's own origin and router base, so it keeps the
 * protocol and host CodeMie is reached on. It is also what an open window is compared with.
 */
export const hostedWindowAddress = (
  route: string,
  pinnedVersion: string | null,
  target: string,
  channel: string | null = null
) => {
  const query = new URLSearchParams()
  if (pinnedVersion) query.set(HOSTED_VERSION_PARAM, pinnedVersion)
  query.set(HOSTED_PATH_PARAM, target)
  if (channel) query.set(HOSTED_OPENER_PARAM, channel)
  return (
    window.location.origin + routerBase() + route + '?' + query.toString().replaceAll('+', '%20')
  )
}

const showsAddress = (popup: Window, href: string) => {
  try {
    return popup.location.href === href
  } catch {
    return false // another origin, such as a sign-in page
  }
}

/**
 * Whether a CodeMie page opened this window, so a hosted application may close it: its opener is a
 * page on CodeMie's own origin. A tab the person opened has no opener, and a window another site
 * opened has an opener on another origin; neither is ever closed. `?path=` and `?opener=` are not
 * used: anyone can put them in an address the person opens in a tab.
 */
export const openedByCodeMie = () => {
  try {
    return !!window.opener && window.opener.location.origin === window.location.origin
  } catch {
    return false // an opener on another origin
  }
}

// Opens a window, passing features only when there are any: no third argument opens a tab.
const openWindow = (href: string, name: string, features?: string) =>
  features ? window.open(href, name, features) : window.open(href, name)

/**
 * Opens a hosted application's local pages as normal CodeMie windows on the application's behalf,
 * for one viewer, and closes them again when that viewer's content asks. `route` is the viewer's own
 * route, so a new window runs the same application; `pinnedVersion` is the version that viewer
 * launched, carried so the new window launches it too (null for a preview, whose route already names
 * its version).
 *
 * Call the returned function synchronously from the message handler, so the click's user activation
 * still allows the pop-up. It ignores anything that is not a valid open or close request.
 */
export function createHostedWindowOpener(
  appId: string,
  route: string,
  pinnedVersion: string | null
): (data: unknown) => void {
  const opens: number[] = []
  // The windows this viewer opened, by the channel the content gave each: only these can be closed.
  const channels = new Map<string, Window>()

  const admit = () => {
    if (navigator.userActivation?.isActive === false) return false
    const now = Date.now()
    while (opens.length && now - opens[0] >= MINUTE_MS) opens.shift()
    if (opens.length >= HOSTED_OPENS_PER_MINUTE) return false
    opens.push(now)
    return true
  }

  // A window answers to its latest channel only, so a stale channel cannot close a reused window;
  // a window opened with no channel answers to none.
  const remember = (channel: string | null, popup: Window) => {
    channels.forEach((known, key) => {
      if (known === popup) channels.delete(key)
    })
    if (channel) channels.set(channel, popup)
  }

  const close = ({ channel }: HostedCloseRequest) => {
    const popup = channels.get(channel)
    channels.delete(channel)
    if (popup && !popup.closed) popup.close()
  }

  const openNamed = (request: HostedOpenRequest, href: string, features?: string) => {
    const windowName = 'codemie-app-' + appId + '-' + request.name
    const existing = opened.get(windowName)
    const reused = existing && !existing.closed ? existing : null
    if (reused && showsAddress(reused, href)) {
      reused.focus()
      remember(request.channel, reused)
      return
    }
    if (!admit()) return
    // For a window that is still open, the browser finds it by name, moves it to the address and
    // ignores new features, so none are passed.
    const popup = openWindow(href, windowName, reused ? undefined : features) ?? reused
    if (!popup) {
      opened.delete(windowName)
      return
    }
    opened.set(windowName, popup)
    remember(request.channel, popup)
    if (reused) popup.focus()
  }

  return (data) => {
    if (isCloseRequest(data)) {
      close(data)
      return
    }
    if (!isOpenRequest(data)) return
    const href = hostedWindowAddress(route, pinnedVersion, data.target, data.channel)
    const features = hostedWindowFeatures(data.features)
    if (!isNewWindowName(data.name)) {
      openNamed(data, href, features)
      return
    }
    if (!admit()) return
    const popup = openWindow(href, '_blank', features)
    if (popup) remember(data.channel, popup)
  }
}
