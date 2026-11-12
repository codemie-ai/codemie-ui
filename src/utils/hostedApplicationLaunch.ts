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

export interface HostedLaunchResponse {
  version_id: string
  content_origin: string
  action: string
  ticket: string
}

export interface ValidatedHostedLaunch {
  action: string
  ticket: string
  origin: string
}

export const HOSTED_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const parseUrl = (value: unknown) => {
  if (typeof value !== 'string') return null
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/**
 * Checks where the one-use ticket is sent: to the content origin the server named, over HTTPS
 * (plain HTTP only for a local `*.localhost` host), and never to the CodeMie host itself. Ticket
 * format, lifetime and host naming belong to the server, which enforces them.
 */
export function validateHostedLaunch(
  response: HostedLaunchResponse,
  uiOrigin: string
): ValidatedHostedLaunch {
  const content = parseUrl(response.content_origin)
  const action = parseUrl(response.action)
  const secure =
    content?.protocol === 'https:' ||
    (content?.protocol === 'http:' && content.hostname.endsWith('.localhost'))
  if (
    !content ||
    !action ||
    !secure ||
    action.origin !== content.origin ||
    content.hostname === new URL(uiOrigin).hostname ||
    typeof response.ticket !== 'string' ||
    !response.ticket
  )
    throw new HostedUserError('Application launch could not be verified. Reload and try again.')
  return { action: action.href, ticket: response.ticket, origin: content.origin }
}

export function submitHostedLaunch(launch: ValidatedHostedLaunch, target = '_self'): void {
  if (target !== '_self' && !/^codemie-hosted-[a-f0-9]{32}$/.test(target))
    throw new Error('Invalid application frame')
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = launch.action
  form.target = target
  form.hidden = true
  const ticket = document.createElement('input')
  ticket.type = 'hidden'
  ticket.name = 'ticket'
  ticket.value = launch.ticket
  form.append(ticket)
  document.body.append(form)
  try {
    form.submit()
  } finally {
    form.remove()
    ticket.value = ''
  }
}
