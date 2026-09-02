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
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import { ButtonType } from '@/constants'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { appInfoStore } from '@/store/appInfo'
import { customerConfigurationStore } from '@/store/customerConfiguration'
import { userStore } from '@/store/user'
import { SettingValue } from '@/types/entity/customerConfiguration'
import toaster from '@/utils/toaster'

import SettingCard from './components/SettingCard'

const PAGE_TITLE = 'Customer Configuration'
const ACCESS_DENIED_MESSAGE =
  'Access denied. Only admins and maintainers can change this configuration.'
const ADMINISTRATION_URL = '/settings/administration'
const EMPTY_MESSAGE = 'No dynamic settings are declared yet.'
const LOAD_FAILED_MESSAGE = 'Failed to load customer configuration'
const SAVED_MESSAGE =
  'Setting saved. New sessions pick it up within a minute; open tabs on the next reload.'
const SAVE_FAILED_MESSAGE = 'Failed to save the setting'
const RESET_MESSAGE = 'Setting reset to the deployment default'
const RESET_FAILED_MESSAGE = 'Failed to reset the setting'
const RESET_ALL_MESSAGE = 'All settings reset to their deployment defaults'
const RESET_ALL_FAILED_MESSAGE = 'Failed to reset every setting'

const CustomerConfigurationPage: FC = () => {
  const navigate = useNavigate()
  const { user } = useSnapshot(userStore)
  const { settings, loading } = useSnapshot(customerConfigurationStore)

  const [isResettingAll, setIsResettingAll] = useState(false)

  const canEdit = (user?.isAdmin ?? false) || (user?.isMaintainer ?? false)
  const overriddenIds = settings
    .filter((setting) => setting.overridden)
    .map((setting) => setting.component_id)

  useEffect(() => {
    if (user && !canEdit) {
      toaster.error(ACCESS_DENIED_MESSAGE)
      navigate(ADMINISTRATION_URL)
    }
  }, [canEdit, navigate, user])

  useEffect(() => {
    if (!canEdit) return
    customerConfigurationStore.indexSettings().catch(() => toaster.error(LOAD_FAILED_MESSAGE))
  }, [canEdit])

  // the saved value only reaches Chat once the tab-wide config cache is refreshed
  const refresh = useCallback(async () => {
    await customerConfigurationStore.indexSettings()
    await appInfoStore.refetchCustomerConfig()
  }, [])

  const handleSave = useCallback(
    async (componentId: string, value: Record<string, SettingValue>) => {
      try {
        await customerConfigurationStore.saveSetting(componentId, value)
        await refresh()
      } catch {
        toaster.error(SAVE_FAILED_MESSAGE)
        return
      }
      toaster.info(SAVED_MESSAGE)
    },
    [refresh]
  )

  const handleReset = useCallback(
    async (componentId: string) => {
      try {
        await customerConfigurationStore.resetSetting(componentId)
        await refresh()
      } catch {
        toaster.error(RESET_FAILED_MESSAGE)
        return
      }
      toaster.info(RESET_MESSAGE)
    },
    [refresh]
  )

  const handleResetAll = async () => {
    setIsResettingAll(true)
    try {
      await Promise.all(
        overriddenIds.map((componentId) => customerConfigurationStore.resetSetting(componentId))
      )
      await refresh()
    } catch {
      toaster.error(RESET_ALL_FAILED_MESSAGE)
      await refresh().catch(() => {})
      return
    } finally {
      setIsResettingAll(false)
    }
    toaster.info(RESET_ALL_MESSAGE)
  }

  if (!canEdit) return null

  const headerActions =
    settings.length > 0 ? (
      <Button
        type={ButtonType.SECONDARY}
        disabled={overriddenIds.length === 0 || isResettingAll}
        isLoading={isResettingAll}
        onClick={handleResetAll}
      >
        Reset all to default
      </Button>
    ) : undefined

  const content = (
    <div className="settings-cards flex flex-col gap-6 w-full max-w-[816px] mx-auto pt-8">
      {settings.length === 0 && !loading ? (
        <p className="text-sm-1 text-text-secondary">{EMPTY_MESSAGE}</p>
      ) : (
        settings.map((setting) => (
          <SettingCard
            key={setting.component_id}
            setting={setting}
            onSave={handleSave}
            onReset={handleReset}
          />
        ))
      )}
    </div>
  )

  return <SettingsLayout contentTitle={PAGE_TITLE} content={content} rightContent={headerActions} />
}

export default CustomerConfigurationPage
