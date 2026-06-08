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

import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { appInfoStore } from '@/store/appInfo'
import { ConfigItem } from '@/types/entity/configuration'
import { getConfigItemSettings, isConfigItemEnabled } from '@/utils/settings'

import { TERMS_AND_CONDITIONS_CONFIG_ID } from '../constants'

export interface TermsAndConditionsState {
  isLoaded: boolean
  isEnabled: boolean
  content?: string
}

export const useTermsAndConditions = (): TermsAndConditionsState => {
  const { configs, isConfigFetched } = useSnapshot(appInfoStore)

  return useMemo(() => {
    const currentConfigs = configs as ConfigItem[]
    const isEnabled = isConfigFetched
      ? isConfigItemEnabled(currentConfigs, TERMS_AND_CONDITIONS_CONFIG_ID)
      : false
    const settings = isEnabled
      ? getConfigItemSettings(currentConfigs, TERMS_AND_CONDITIONS_CONFIG_ID)
      : null

    return {
      isLoaded: isConfigFetched,
      isEnabled,
      content: settings?.content,
    }
  }, [configs, isConfigFetched])
}
