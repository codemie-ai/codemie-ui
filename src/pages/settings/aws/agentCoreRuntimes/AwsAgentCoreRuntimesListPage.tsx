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

import { FC } from 'react'
import { generatePath, useNavigate, useParams } from 'react-router'

import ViewSvg from '@/assets/icons/view.svg?react'
import Button from '@/components/Button'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import {
  SETTINGS_AWS_AGENTCORE_RUNTIMES_PATH,
  SETTINGS_AWS_AGENTCORE_RUNTIMES_RUNTIME_PATH,
} from '@/constants/routes'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import AwsEntityList from '@/pages/settings/components/vendor/AwsEntityList'
import {
  AgentCoreEndpointStatus,
  VendorAgentCoreRuntime,
  VendorEntity,
  VendorEntityType,
  VendorOriginType,
} from '@/types/entity/vendor'

import { RUNTIME_BADGE_MAP } from './constants'

const RuntimeMeta = ({ entity }: { entity: VendorEntity }) => {
  const runtime = entity as unknown as VendorAgentCoreRuntime
  const { text, statusEnum } =
    RUNTIME_BADGE_MAP[runtime.status ?? AgentCoreEndpointStatus.NOT_PREPARED] ??
    RUNTIME_BADGE_MAP[AgentCoreEndpointStatus.NOT_PREPARED]
  return (
    <div className="flex flex-row gap-1">
      <StatusBadge status={statusEnum} text={text} />
      {runtime.version && <StatusBadge text={`v${runtime.version}`} status={StatusEnum.Success} />}
    </div>
  )
}

const VIEWABLE_STATUSES = new Set<string>([
  AgentCoreEndpointStatus.PREPARED,
  AgentCoreEndpointStatus.DELETED_ON_AWS,
])

const AwsAgentCoreRuntimesListPage: FC = () => {
  const navigate = useNavigate()
  const { settingId } = useParams<{ settingId: string }>()

  const goToRuntime = (entity: VendorEntity) => {
    navigate(
      generatePath(SETTINGS_AWS_AGENTCORE_RUNTIMES_RUNTIME_PATH, {
        settingId: settingId!,
        runtimeId: entity.id,
      })
    )
  }

  const renderRuntimeActions = (entity: VendorEntity) => {
    if (!VIEWABLE_STATUSES.has(entity.status)) return null
    return (
      <Button type="secondary" onClick={() => goToRuntime(entity)}>
        <ViewSvg />
        View
      </Button>
    )
  }

  return (
    <SettingsLayout
      content={
        <AwsEntityList
          originType={VendorOriginType.AWS}
          entityType={VendorEntityType.agentcoreRuntimes}
          settingId={settingId!}
          renderEntityMeta={(entity) => <RuntimeMeta entity={entity} />}
          renderActions={renderRuntimeActions}
          onEntityClick={goToRuntime}
        />
      }
      contentTitle="AgentCore Runtimes"
      onBack={() => navigate(SETTINGS_AWS_AGENTCORE_RUNTIMES_PATH, { replace: true })}
    />
  )
}

export default AwsAgentCoreRuntimesListPage
