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

import React from 'react'

import StatusBadge from '@/components/StatusBadge/StatusBadge'
import { INTEGRATION_ENABLED_BADGE_MAP } from '@/constants/integration'
import { SettingCredentialValue } from '@/types/entity/setting'

interface Props {
  credentialValues: SettingCredentialValue[]
}

const IntegrationStateBadge: React.FC<Props> = ({ credentialValues }) => {
  const entry = credentialValues.find((cv) => cv.key === 'is_enabled')
  if (entry === undefined) return null
  const key =
    entry.value === true || entry.value === 1 || String(entry.value).toLowerCase() === 'true'
      ? 'enabled'
      : 'disabled'
  const badge = INTEGRATION_ENABLED_BADGE_MAP[key]

  return <StatusBadge status={badge.statusEnum} text={badge.text} />
}

export default IntegrationStateBadge
