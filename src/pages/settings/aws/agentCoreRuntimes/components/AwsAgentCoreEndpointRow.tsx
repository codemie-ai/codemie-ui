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

import ChatSvg from '@/assets/icons/chat.svg?react'
import ConfigureSvg from '@/assets/icons/configure.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import DownloadSvg from '@/assets/icons/download.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import { AgentCoreEndpointStatus, VendorAgentCoreEndpoint } from '@/types/entity/vendor'

import { ENDPOINT_STATUSES } from '../constants'

const STATUS_BADGE_MAP: Record<
  AgentCoreEndpointStatus,
  { badge: (typeof StatusEnum)[keyof typeof StatusEnum]; label: string }
> = {
  [AgentCoreEndpointStatus.PREPARED]: {
    badge: StatusEnum.Success,
    label: ENDPOINT_STATUSES.PREPARED,
  },
  [AgentCoreEndpointStatus.NOT_PREPARED]: {
    badge: StatusEnum.InProgress,
    label: ENDPOINT_STATUSES.NOT_PREPARED,
  },
  [AgentCoreEndpointStatus.VERSION_DRIFT]: {
    badge: StatusEnum.Warning,
    label: ENDPOINT_STATUSES.VERSION_DRIFT,
  },
  [AgentCoreEndpointStatus.DELETED_ON_AWS]: {
    badge: StatusEnum.Error,
    label: ENDPOINT_STATUSES.DELETED_ON_AWS,
  },
}

interface AwsAgentCoreEndpointRowProps {
  endpoint: VendorAgentCoreEndpoint
  onDetails: () => void
  onImport: () => void
  onDelete: () => void
  onReinstall: () => void
  onConfigure: () => void
  onChat: () => void
  isActioning: boolean
}

const AwsAgentCoreEndpointRow: React.FC<AwsAgentCoreEndpointRowProps> = ({
  endpoint,
  onDetails,
  onImport,
  onDelete,
  onReinstall,
  onConfigure,
  onChat,
  isActioning,
}) => {
  const { badge, label } = STATUS_BADGE_MAP[endpoint.status] ?? STATUS_BADGE_MAP.NOT_PREPARED

  const canImport = endpoint.status === AgentCoreEndpointStatus.PREPARED && !endpoint.aiRunId
  const canReimport = endpoint.status === AgentCoreEndpointStatus.VERSION_DRIFT
  const canUnimport = !!endpoint.aiRunId && !canReimport
  const isDeletedOnAws = endpoint.status === AgentCoreEndpointStatus.DELETED_ON_AWS

  return (
    <div className="flex items-center justify-between border border-border-structural rounded-md px-4 py-3 gap-4">
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{endpoint.name}</div>
        {endpoint.id && (
          <div className="text-xs text-text-quaternary truncate">ID: {endpoint.id}</div>
        )}
        <div className="flex flex-row gap-2 items-center mt-1 text-xs">
          <StatusBadge status={badge} text={label} />
          {endpoint.liveVersion && (
            <StatusBadge text={`v${endpoint.liveVersion}`} status={StatusEnum.Success} />
          )}
        </div>
      </div>
      <div className="flex flex-row items-center gap-2 shrink-0">
        {canImport && (
          <Button
            type="secondary"
            onClick={onImport}
            disabled={isActioning}
            isLoading={isActioning}
          >
            <DownloadSvg className="w-3.5 h-3.5" />
            Install
          </Button>
        )}
        {canReimport && (
          <Button
            type="secondary"
            onClick={onReinstall}
            disabled={isActioning}
            isLoading={isActioning}
          >
            <RefreshSvg className="w-3.5 h-3.5" />
            Reinstall
          </Button>
        )}
        {canUnimport && (
          <Button type="delete" onClick={onDelete} disabled={isActioning} isLoading={isActioning}>
            <DeleteSvg className="w-3.5 h-3.5" />
            Uninstall
          </Button>
        )}
        {canUnimport && (
          <Button type="secondary" onClick={onConfigure} disabled={isActioning}>
            <ConfigureSvg className="w-3.5 h-3.5" />
            Configure
          </Button>
        )}
        {endpoint.aiRunId && (
          <Button type="secondary" onClick={onChat} disabled={isActioning}>
            <ChatSvg className="w-3.5 h-3.5" />
            Chat
          </Button>
        )}
        {!isDeletedOnAws && (
          <Button type="secondary" onClick={onDetails} disabled={isActioning} aria-label="Details">
            <InfoSvg className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default AwsAgentCoreEndpointRow
