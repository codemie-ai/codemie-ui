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
import { HostedUserError } from '@/types/entity/hostedApplication'
import type { ValidatedHostedLaunch } from '@/utils/hostedApplicationLaunch'

// The only request-derived values in the container: a scheme, a lower-case host and a port.
// Nothing that can close an attribute, a string or a tag passes this allowlist.
const SAFE_ORIGIN = /^https?:\/\/[a-z0-9.-]+(:\d{1,5})?$/

export interface HostedFrame {
  /**
   * HTML sanitized by its producer, createHostedFrame: a constant template whose only interpolated
   * values are a random nonce and target and two origins checked against SAFE_ORIGIN. Render it
   * only as produced here.
   */
  document: string
  target: string
}

/** Fixed trusted container only. Uploaded HTML, app metadata and credentials never enter it. */
export function createHostedFrame(launch: ValidatedHostedLaunch, uiOrigin: string): HostedFrame {
  if (!SAFE_ORIGIN.test(launch.origin) || !SAFE_ORIGIN.test(uiOrigin))
    throw new HostedUserError('Application launch could not be verified. Reload and try again.')
  const content = new URL(launch.origin)
  const ui = new URL(uiOrigin)
  // Uploaded content must never share the CodeMie host: the frame allows scripts and same-origin.
  if (
    content.origin !== launch.origin ||
    new URL(launch.action).origin !== launch.origin ||
    !['http:', 'https:'].includes(content.protocol) ||
    content.hostname === ui.hostname ||
    ui.origin !== uiOrigin
  )
    throw new HostedUserError('Application launch could not be verified. Reload and try again.')
  const target = 'codemie-hosted-' + crypto.randomUUID().replaceAll('-', '')
  const nonce = crypto.randomUUID().replaceAll('-', '')
  // This CSP belongs to the trusted container, so navigation to unrelated Platform apps
  // remains unaffected. A child cannot navigate itself to an external origin.
  const csp = `default-src 'none'; base-uri 'none'; form-action 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; frame-src ${content.origin}`
  const script = `const child=document.querySelector('iframe');addEventListener('message',event=>{
    if(event.source!==child.contentWindow||event.origin!==${JSON.stringify(content.origin)})return;
    const type=event.data&&event.data.type;
    if(type==='codemie-hosted-ready'||type==='codemie-hosted-unavailable')parent.postMessage({type},${JSON.stringify(
      uiOrigin
    )});
  });`
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Application container</title><style nonce="${nonce}">html,body,iframe{margin:0;width:100%;height:100%;border:0;overflow:hidden}html,body{color-scheme:light;background:Canvas}</style></head><body><iframe title="Application content" name="${target}" sandbox="allow-scripts allow-same-origin" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen 'none'" tabindex="0" referrerpolicy="no-referrer"></iframe><script nonce="${nonce}">${script}</script></body></html>`
  return { target, document }
}
