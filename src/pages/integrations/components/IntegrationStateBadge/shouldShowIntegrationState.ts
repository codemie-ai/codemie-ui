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

import { SettingCredentialValue } from '@/types/entity/setting'

const IS_ENABLED_KEY = 'is_enabled'
const SCHEDULER_CREDENTIAL_TYPE = 'scheduler'

export const hasExplicitIsEnabled = (
  credentialValues: SettingCredentialValue[] | undefined
): boolean => Boolean(credentialValues?.some((cv) => cv.key === IS_ENABLED_KEY))

export const isSchedulerCredentialType = (credentialType: string): boolean =>
  credentialType.toLowerCase() === SCHEDULER_CREDENTIAL_TYPE

/**
 * Scheduler always shows state (defaults to Disabled when is_enabled is unset).
 * Other types show state only when is_enabled is explicitly present.
 */
export const shouldShowIntegrationState = (item: {
  credential_type: string
  credential_values?: SettingCredentialValue[]
}): boolean => {
  if (isSchedulerCredentialType(item.credential_type)) return true
  return hasExplicitIsEnabled(item.credential_values)
}
