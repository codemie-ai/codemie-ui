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

import { proxy } from 'valtio'

/**
 * Tracks which per-user OAuth settings have already fired their one-shot
 * "connected" notification. The auth-gate rows live inside chat messages that
 * can remount (virtualized history, re-render), which would reset a component
 * -local guard and re-fire `onConnected`. Keying the guard by `settingId` in a
 * module-level store makes it survive those remounts.
 */
export interface OAuthConnectNotifiedStoreType {
  notified: Record<string, boolean>
  hasNotified: (settingId: string) => boolean
  markNotified: (settingId: string) => void
  clearNotified: (settingId: string) => void
  reset: () => void
}

export const oauthConnectNotifiedStore = proxy<OAuthConnectNotifiedStoreType>({
  notified: {},

  hasNotified(settingId: string): boolean {
    return this.notified[settingId] === true
  },

  markNotified(settingId: string): void {
    this.notified[settingId] = true
  },

  clearNotified(settingId: string): void {
    delete this.notified[settingId]
  },

  reset(): void {
    this.notified = {}
  },
})
