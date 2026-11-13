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

/**
 * Message kinds a hosted application's content posts to the trusted container, which relays them to
 * the viewer. The backend's content scripts send the same kinds; change both sides together.
 */
export const HOSTED_MESSAGE = {
  /** The content finished loading. */
  ready: 'codemie-hosted-ready',
  /** The content host is busy or could not start the embedded session. */
  unavailable: 'codemie-hosted-unavailable',
  /** Open a local page as a CodeMie window. Fields: `target`, `name`, `channel` and `features`. */
  open: 'codemie-hosted-open',
  /** Close the window this viewer opened for `channel`. */
  close: 'codemie-hosted-close',
  /** The content called `window.close()`: close this CodeMie window, if CodeMie opened it. No fields. */
  closeSelf: 'codemie-hosted-close-self',
  /** The content's own address changed. Sent by the content, not relayed or read by the UI yet. */
  location: 'codemie-hosted-location',
} as const

/** The content broker's id for a window it asked for: a UUID, or any 8-64 letters, digits and dashes. */
export const HOSTED_CHANNEL = /^[A-Za-z0-9-]{8,64}$/

/** Joins the content frame's own name and the opener channel it carries for the content. */
export const HOSTED_FRAME_OPENER = '-opener-'

/** A request to open a local page of the application in a CodeMie window, as the container relays it. */
export interface HostedOpenRequest {
  type: typeof HOSTED_MESSAGE.open
  /** The local page: path, query and fragment. */
  target: string
  /** The window name the content gave; an empty name or one starting with `_` means a new window. */
  name: string
  /**
   * The content broker's id for this window (8-64 letters, digits and dashes). The new window gets it
   * as `?opener=`, so its content and the opener's content can talk; a close request names it. Null
   * for a link or a no-opener window, which have nothing to talk to: they open with no opener.
   */
  channel: string | null
  /** The `window.open` features the content asked for; null opens a tab. */
  features: HostedWindowFeatures | null
}

/** The window features a hosted application may ask for: all optional, sizes and positions in pixels. */
export interface HostedWindowFeatures {
  popup?: true
  width?: number
  height?: number
  left?: number
  top?: number
}

/** A request to close the window opened for one channel, as the container relays it. */
export interface HostedCloseRequest {
  type: typeof HOSTED_MESSAGE.close
  channel: string
}
