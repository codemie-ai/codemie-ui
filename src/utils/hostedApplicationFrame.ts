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
import {
  HOSTED_CHANNEL,
  HOSTED_FRAME_OPENER,
  HOSTED_MESSAGE,
} from '@/utils/hostedApplicationMessages'

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

/**
 * Fixed trusted container only. Uploaded HTML, app metadata and credentials never enter it.
 * `opener` is the channel of the window that opened this one: the content frame's name carries it
 * (`codemie-hosted-<id>-opener-<channel>`) for the content to read. Only a valid channel is used,
 * which has no character that could leave the attribute.
 */
export function createHostedFrame(
  launch: ValidatedHostedLaunch,
  uiOrigin: string,
  opener: string | null = null
): HostedFrame {
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
  const target =
    'codemie-hosted-' +
    crypto.randomUUID().replaceAll('-', '') +
    (typeof opener === 'string' && HOSTED_CHANNEL.test(opener) ? HOSTED_FRAME_OPENER + opener : '')
  const nonce = crypto.randomUUID().replaceAll('-', '')
  // This CSP belongs to the trusted container, so navigation to unrelated Platform apps
  // remains unaffected. A child cannot navigate itself to an external origin.
  const csp = `default-src 'none'; base-uri 'none'; form-action 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; frame-src ${content.origin}`
  const toUi = JSON.stringify(uiOrigin)
  const ready = JSON.stringify(HOSTED_MESSAGE.ready)
  const unavailable = JSON.stringify(HOSTED_MESSAGE.unavailable)
  const closeSelf = JSON.stringify(HOSTED_MESSAGE.closeSelf)
  const open = JSON.stringify(HOSTED_MESSAGE.open)
  const close = JSON.stringify(HOSTED_MESSAGE.close)
  // Relays only known kinds and fields, rebuilt: features keep popup === true and integer sizes only.
  const script = `const child=document.querySelector('iframe');addEventListener('message',event=>{
    if(event.source!==child.contentWindow||event.origin!==${JSON.stringify(content.origin)})return;
    const data=event.data,type=data&&data.type;
    if(type===${ready}||type===${unavailable}||type===${closeSelf})parent.postMessage({type},${toUi});
    if(type!==${open}&&type!==${close})return;
    const channel=data.channel,named=typeof channel==='string'&&${String(
      HOSTED_CHANNEL
    )}.test(channel);
    if(type===${close}&&named)parent.postMessage({type,channel},${toUi});
    if(!named&&channel!==null)return;
    if(type!==${open}||typeof data.target!=='string'||typeof data.name!=='string')return;
    const asked=data.features;let features=null;
    if(asked&&typeof asked==='object'&&!Array.isArray(asked)){features={};
      if(asked.popup===true)features.popup=true;
      for(const key of ['width','height','left','top'])if(Number.isInteger(asked[key]))features[key]=asked[key];}
    parent.postMessage({type,target:data.target,name:data.name,channel,features},${toUi});
  });`
  const document = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><title>Application container</title><style nonce="${nonce}">html,body,iframe{margin:0;width:100%;height:100%;border:0;overflow:hidden}html,body{color-scheme:light;background:Canvas}</style></head><body><iframe title="Application content" name="${target}" sandbox="allow-scripts allow-same-origin allow-popups" allow="camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'; fullscreen ${content.origin}" tabindex="0" referrerpolicy="no-referrer"></iframe><script nonce="${nonce}">${script}</script></body></html>`
  return { target, document }
}
