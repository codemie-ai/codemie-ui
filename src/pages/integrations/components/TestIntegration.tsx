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

import React, { useState } from 'react'
import { useSnapshot } from 'valtio'

import Checker from '@/components/Checker/Checker'
import { CHECKER_STATUSES } from '@/constants/common'
import { userSettingsStore } from '@/store/userSettings'
import { convertCredsToKeyValue, getOriginalCredentialType } from '@/utils/settings'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

export const TEST_INTEGRATION_INLINE_CLASS =
  'flex gap-4 px-1 py-2 outline-none rounded-md items-center justify-start text-xs w-full text-left h-auto !border-none font-medium text-text-primary leading-4 tracking-tight disabled:text-text-tertiary hover:bg-surface-specific-dropdown-hover hover:text-text-accent'

interface TestIntegrationProps {
  label?: string
  credentialType: string
  credentialValues?: Record<string, any>
  settingId?: string
  inline?: boolean
  inlineClass?: string
  testIcon?: 'connection'
}

const TestIntegration: React.FC<TestIntegrationProps> = ({
  label = 'Test Integration',
  credentialType,
  credentialValues,
  settingId,
  inline = false,
  inlineClass = '',
  testIcon,
}) => {
  const [status, setStatus] = useState<string>(CHECKER_STATUSES.UNDEFINED)

  const userSettingsSnap = useSnapshot(userSettingsStore)

  const testSetting = async (
    type: string,
    settingId?: string,
    values?: Record<string, unknown>
  ) => {
    return userSettingsSnap.testSetting(type, settingId, values)
  }

  const check = async () => {
    if (status === CHECKER_STATUSES.IN_PROGRESS) return

    setStatus(CHECKER_STATUSES.IN_PROGRESS)

    try {
      const response = await testSetting(
        getOriginalCredentialType(credentialType),
        settingId,
        convertCredsToKeyValue(credentialValues) as any
      )

      if (!response.success) {
        toaster.error(`Integration test failed: ${response.message}`)
        setStatus(CHECKER_STATUSES.FAILED)
        return
      }

      toaster.info('Integration test successful')
      setStatus(CHECKER_STATUSES.SUCCESS)
    } catch (error) {
      console.error(error)
      setStatus(CHECKER_STATUSES.FAILED)
    }
  }

  const classNames = cn(inline ? TEST_INTEGRATION_INLINE_CLASS : '', inlineClass)

  return (
    <Checker
      label={label}
      classNames={classNames}
      status={status}
      onCheck={check}
      testIcon={testIcon}
    />
  )
}

export default TestIntegration
