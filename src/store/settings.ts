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

import { Setting } from '@/types/entity/setting'
import api from '@/utils/api'

interface SettingsStoreType {
  settings: Record<string, Setting[]>
  indexSettings: () => Promise<Record<string, Setting[]>>
}

export const settingsStore = proxy<SettingsStoreType>({
  settings: {},

  indexSettings() {
    return api
      .get('v1/settings/user/available')
      .then((response) => response.json())
      .then((settings) => {
        settingsStore.settings = {}
        settings.forEach((setting: Setting) => {
          const ctLower = setting.credential_type.toLowerCase()
          if (!settingsStore.settings[ctLower]) {
            settingsStore.settings[ctLower] = []
          }
          settingsStore.settings[ctLower].push(setting)
        })
        return settingsStore.settings
      })
  },
})
