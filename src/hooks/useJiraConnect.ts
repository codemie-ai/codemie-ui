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

import { UseOAuthConnectReturn, useOAuthConnect } from '@/hooks/useOAuthConnect'
import { userSettingsStore } from '@/store/userSettings'

type UseJiraConnectReturn = UseOAuthConnectReturn

/**
 * Drives a per-user OAuth connect against an EXISTING shared Jira integration, identified by
 * `settingId`. App credentials are loaded server-side, so the member only authorizes under their
 * own Atlassian account. Mirrors useGitLabConnect: popup + status polling with server-side
 * callback persistence.
 */
export const useJiraConnect = (settingId: string): UseJiraConnectReturn =>
  useOAuthConnect({
    settingId,
    connect: (id) => userSettingsStore.connectJiraOAuth(id),
    getConnectionStatus: (id) => userSettingsStore.getJiraConnectionStatus(id),
  })
