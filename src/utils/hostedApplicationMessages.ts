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
  /** Open a local page as a CodeMie window. Fields: `target` and `name`, both strings. */
  open: 'codemie-hosted-open',
  /** The content's own address changed. Sent by the content, not relayed or read by the UI yet. */
  location: 'codemie-hosted-location',
} as const

/** A request to open a local page of the application in a CodeMie window, as the container relays it. */
export interface HostedOpenRequest {
  type: typeof HOSTED_MESSAGE.open
  /** The local page: path, query and fragment. */
  target: string
  /** The window name the content gave; an empty name or one starting with `_` means a new window. */
  name: string
}
