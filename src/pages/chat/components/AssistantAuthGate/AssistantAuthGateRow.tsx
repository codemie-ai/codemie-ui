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

import Button from '@/components/Button'
import InfoWarning from '@/components/InfoWarning'
import Spinner from '@/components/Spinner'
import StatusBadge, { StatusEnum, StatusType } from '@/components/StatusBadge'
import { ButtonSize, ButtonType, InfoWarningType } from '@/constants'
import { MCPAuthGateServer, MCPAuthGateStatus } from '@/types/entity/mcpAuth'
import { cn } from '@/utils/utils'

interface AssistantAuthGateRowProps {
  row: MCPAuthGateServer
  onAuthenticate: (mcpConfigId: string) => void
}

const ROW_STYLES: Record<MCPAuthGateStatus, string> = {
  authenticated: 'border-success-primary/30 bg-success-secondary/15',
  authentication_required: 'border-border-structural bg-surface-elevated',
  authenticating: 'border-in-progress-secondary/40 bg-in-progress-tertiary/20',
  session_expired: 'border-aborted-primary/40 bg-aborted-primary/10',
  config_error: 'border-failed-secondary/40 bg-failed-secondary/10',
  discovery_failed: 'border-aborted-primary/40 bg-aborted-primary/10',
}

const STATUS_BADGES: Record<MCPAuthGateStatus, { status: StatusType; text: string }> = {
  authenticated: { status: StatusEnum.Success, text: 'Authenticated' },
  authentication_required: { status: StatusEnum.Pending, text: 'Action required' },
  authenticating: { status: StatusEnum.InProgress, text: 'Authenticating' },
  session_expired: { status: StatusEnum.Warning, text: 'Session expired' },
  config_error: { status: StatusEnum.Error, text: 'Config error' },
  discovery_failed: { status: StatusEnum.Warning, text: 'Unavailable' },
}

const isRenderableStatus = (status: string): status is MCPAuthGateStatus => status in STATUS_BADGES

const getInfoWarningProps = (
  row: MCPAuthGateServer
): { header: string; message: string; type: InfoWarningType } | null => {
  switch (row.status) {
    case 'config_error':
      return {
        header: 'Configuration error',
        message: `${
          row.error_context ?? 'Authentication setup is invalid.'
        } Contact your administrator.`,
        type: InfoWarningType.ERROR,
      }
    case 'discovery_failed':
      return {
        header: 'Server unavailable',
        message: row.error_context ?? 'Authentication discovery is unavailable right now.',
        type: InfoWarningType.WARNING,
      }
    default:
      return null
  }
}

const AssistantAuthGateRow: React.FC<AssistantAuthGateRowProps> = ({ row, onAuthenticate }) => {
  if (!isRenderableStatus(row.status)) return null

  const infoWarning = getInfoWarningProps(row)

  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border p-4', ROW_STYLES[row.status])}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text-primary">{row.mcp_config_name}</div>
          {row.as_hostname && (
            <div className="mt-1 text-xs text-text-secondary">{row.as_hostname}</div>
          )}
          {row.status === 'authentication_required' && row.error_context && (
            <div className="mt-2 text-xs text-text-secondary">{row.error_context}</div>
          )}
          {row.status === 'session_expired' && row.error_context && (
            <div className="mt-2 text-xs text-text-secondary">{row.error_context}</div>
          )}
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <StatusBadge {...STATUS_BADGES[row.status]} />

          {row.status === 'authentication_required' && (
            <Button
              type={ButtonType.PRIMARY}
              size={ButtonSize.SMALL}
              disabled={!row.initiate_url}
              onClick={() => onAuthenticate(row.mcp_config_id)}
            >
              Authenticate
            </Button>
          )}

          {row.status === 'session_expired' && (
            <Button
              type={ButtonType.SECONDARY}
              size={ButtonSize.SMALL}
              disabled={!row.initiate_url}
              onClick={() => onAuthenticate(row.mcp_config_id)}
            >
              Re-authenticate
            </Button>
          )}

          {row.status === 'authenticating' && (
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <Spinner inline className="h-4 w-4" rootClassName="min-h-0 pt-0" />
              <span>Waiting for browser sign-in</span>
            </div>
          )}
        </div>
      </div>

      {infoWarning && (
        <InfoWarning
          header={infoWarning.header}
          message={infoWarning.message}
          type={infoWarning.type}
        />
      )}
    </div>
  )
}

export { isRenderableStatus }
export default AssistantAuthGateRow
