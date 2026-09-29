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
/**
 * File download grants for a shared conversation.
 *
 * `GET /v1/share/conversations/{token}` returns `shared_file_urls`: a map from every encoded file
 * token the conversation refers to, to the same token carrying `?share_token=...`. The backend
 * deliberately leaves `file_names` and message text holding bare tokens, so a recipient has to
 * resolve references through this map before requesting a file — otherwise the download is denied,
 * since the files belong to whoever shared the conversation.
 *
 * Outside a shared conversation the map is empty and every resolver here is a no-op.
 */

const SANDBOX_FILE_PREFIX = 'sandbox:/v1/files/'
const SANDBOX_FILE_REGEXP = /sandbox:\/v1\/files\/[^\s)\]>"']+/g

let sharedFileUrls: Record<string, string> = {}

export const setSharedFileGrants = (grants?: Record<string, string> | null): void => {
  sharedFileUrls = grants ?? {}
}

export const clearSharedFileGrants = (): void => {
  sharedFileUrls = {}
}

/** Map a bare file token to the one carrying the share grant, or return it unchanged. */
export const resolveSharedFileToken = (fileToken: string): string =>
  sharedFileUrls[fileToken] ?? fileToken

/** Turn every inline `sandbox:/v1/files/<token>` reference into a request URL. */
export const resolveSandboxFileUrls = (message: string, baseUrl: string): string =>
  message.replace(
    SANDBOX_FILE_REGEXP,
    (match) =>
      `${baseUrl}/v1/files/${resolveSharedFileToken(match.slice(SANDBOX_FILE_PREFIX.length))}`
  )
