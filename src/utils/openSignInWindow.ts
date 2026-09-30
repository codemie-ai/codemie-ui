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

export type OpenSignInResult =
  | { status: 'opened'; window: Window }
  | { status: 'blocked' }
  | { status: 'invalid_url' }

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const isHttpUrl = (value: string): boolean => {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol)
  } catch {
    return false
  }
}

/**
 * Opens the sign-in window synchronously (inside the user gesture) with the opener cut, so an
 * identity provider cannot detect or close it. Navigation happens only for http(s) URLs.
 */
export const openSignInWindow = (authUrl: string): OpenSignInResult => {
  const signInWindow = window.open('', '_blank')

  if (!signInWindow) {
    return { status: 'blocked' }
  }

  signInWindow.opener = null

  if (!isHttpUrl(authUrl)) {
    signInWindow.close()
    return { status: 'invalid_url' }
  }

  signInWindow.location.href = authUrl
  return { status: 'opened', window: signInWindow }
}
