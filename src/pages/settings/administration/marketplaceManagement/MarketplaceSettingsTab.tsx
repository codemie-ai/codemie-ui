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

import { FC, useCallback, useEffect, useState } from 'react'

import {
  MARKETPLACE_TAB_KEYS,
  SETTING_RESET_FAILED_MESSAGE,
  SETTING_RESET_MESSAGE,
  SETTING_SAVE_FAILED_MESSAGE,
  SETTING_SAVED_MESSAGE,
} from '@/constants/configKeys'
import { customerConfigurationStore } from '@/store/customerConfiguration'
import { SettingDeclaration } from '@/types/entity/customerConfiguration'
import toaster from '@/utils/toaster'

import SettingCard from '../components/SettingCard'

const MarketplaceSettingsTab: FC = () => {
  const [auditSettings, setAuditSettings] = useState<SettingDeclaration[]>([])

  const refresh = useCallback(() => {
    customerConfigurationStore
      .indexSettings()
      .then((all) => setAuditSettings(all.filter((s) => MARKETPLACE_TAB_KEYS.has(s.component_id))))
      .catch((err: Error) => toaster.error(`Failed to load audit settings: ${err.message}`))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <div data-testid="marketplace-settings-tab" className="flex flex-col gap-6">
      {auditSettings.map((setting) => (
        <SettingCard
          key={setting.component_id}
          setting={setting}
          onSave={async (id, val) => {
            try {
              await customerConfigurationStore.saveSetting(id, val)
              refresh()
              toaster.info(SETTING_SAVED_MESSAGE)
            } catch {
              toaster.error(SETTING_SAVE_FAILED_MESSAGE)
            }
          }}
          onReset={async (id) => {
            try {
              await customerConfigurationStore.resetSetting(id)
              refresh()
              toaster.info(SETTING_RESET_MESSAGE)
            } catch {
              toaster.error(SETTING_RESET_FAILED_MESSAGE)
            }
          }}
        />
      ))}
    </div>
  )
}

export default MarketplaceSettingsTab
