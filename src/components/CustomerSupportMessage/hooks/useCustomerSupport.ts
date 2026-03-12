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

import { useMemo, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'
import { isConfigItemEnabled, getConfigItemSettings } from '@/utils/settings'

export interface CustomerSupportSettings {
  enabled: boolean
  availableForExternal?: boolean
  name?: string
  url?: string
}

export const useCustomerSupport = () => {
  const { configs, isConfigFetched } = useSnapshot(appInfoStore)

  useEffect(() => {
    if (!isConfigFetched) {
      appInfoStore.fetchCustomerConfig()
    }
  }, [isConfigFetched])

  const isEnabled = useMemo(() => {
    if (!configs || configs.length === 0) return false
    return isConfigItemEnabled(configs, 'customerSupport')
  }, [configs])

  const settings = useMemo(() => {
    if (!configs || configs.length === 0 || !isEnabled) return null
    return getConfigItemSettings(configs, 'customerSupport') as CustomerSupportSettings
  }, [configs, isEnabled])

  return { isEnabled, settings, isLoading: !isConfigFetched }
}
