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

import { HOSTED_MESSAGE, type HostedOpenRequest } from '@/utils/hostedApplicationMessages'

/** Longest local page a hosted application may ask CodeMie to open: path, query and fragment. */
export const HOSTED_PATH_MAX = 4096

/** Longest window name a hosted application may give a window it asks CodeMie to open. */
export const HOSTED_WINDOW_NAME_MAX = 200

/** Query parameters of the viewer route that say where a new window starts. */
export const HOSTED_PATH_PARAM = 'path'
export const HOSTED_VERSION_PARAM = 'version'

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
    request.name.length <= HOSTED_WINDOW_NAME_MAX
  )
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
  target: string
) => {
  const query = new URLSearchParams()
  if (pinnedVersion) query.set(HOSTED_VERSION_PARAM, pinnedVersion)
  query.set(HOSTED_PATH_PARAM, target)
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
 * Opens a hosted application's local pages as normal CodeMie windows on the application's behalf,
 * for one viewer. `route` is the viewer's own route, so a new window runs the same application;
 * `pinnedVersion` is the version that viewer launched, carried so the new window launches it too
 * (null for a preview, whose route already names its version).
 *
 * Call the returned function synchronously from the message handler, so the click's user activation
 * still allows the pop-up. It ignores anything that is not a valid open request.
 */
export function createHostedWindowOpener(
  appId: string,
  route: string,
  pinnedVersion: string | null
): (data: unknown) => void {
  const opens: number[] = []

  const admit = () => {
    if (navigator.userActivation?.isActive === false) return false
    const now = Date.now()
    while (opens.length && now - opens[0] >= MINUTE_MS) opens.shift()
    if (opens.length >= HOSTED_OPENS_PER_MINUTE) return false
    opens.push(now)
    return true
  }

  return (data) => {
    if (!isOpenRequest(data)) return
    const href = hostedWindowAddress(route, pinnedVersion, data.target)
    if (isNewWindowName(data.name)) {
      if (admit()) window.open(href, '_blank')
      return
    }
    const windowName = 'codemie-app-' + appId + '-' + data.name
    const existing = opened.get(windowName)
    if (existing && !existing.closed && showsAddress(existing, href)) {
      existing.focus()
      return
    }
    if (!admit()) return
    // For a window that is still open, the browser finds it by name and moves it to the address.
    const popup = window.open(href, windowName) ?? (existing?.closed ? null : existing)
    if (!popup) {
      opened.delete(windowName)
      return
    }
    opened.set(windowName, popup)
    if (existing && !existing.closed) popup.focus()
  }
}
