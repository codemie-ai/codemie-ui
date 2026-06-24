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

import { FC, useEffect, useState } from 'react'

import DetailsCopyField from '@/components/details/DetailsCopyField'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import { awsVendorStore } from '@/store/vendor'
import { AgentCoreEndpointStatus, VendorAgentCoreEndpointDetails } from '@/types/entity/vendor'
import { formatDateTime } from '@/utils/helpers'

import { AGENTCORE_STATUSES } from '../constants'

const DetailField: FC<{ label: string; value?: string | null; className?: string }> = ({
  label,
  value,
  className,
}) => (
  <div className={`flex flex-col gap-0.5 ${className ?? ''}`}>
    <span className="text-xs text-text-quaternary">{label}</span>
    <span className="text-sm break-all">{value ?? '—'}</span>
  </div>
)

const Content: FC<{ settingId: string; runtimeId: string; endpointName: string }> = ({
  settingId,
  runtimeId,
  endpointName,
}) => {
  const [details, setDetails] = useState<VendorAgentCoreEndpointDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    awsVendorStore
      .getAgentCoreEndpointDetails(settingId, runtimeId, endpointName)
      .then(setDetails)
      .catch((error) => console.error('Failed to fetch endpoint details:', error))
      .finally(() => setLoading(false))
  }, [settingId, runtimeId, endpointName])

  if (loading)
    return (
      <div className="flex justify-center">
        <Spinner inline rootClassName="py-8" />
      </div>
    )
  if (!details) return null

  const isReady = details.status === AgentCoreEndpointStatus.PREPARED

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex gap-8">
        <DetailField label="Name" value={details.name} className="flex-1" />

        <div className="flex flex-1 flex-col gap-0.5 text-xs">
          <span className="text-text-quaternary">Status</span>
          <StatusBadge
            status={isReady ? StatusEnum.Success : StatusEnum.InProgress}
            text={isReady ? AGENTCORE_STATUSES.READY : AGENTCORE_STATUSES.NOT_READY}
          />
        </div>
      </div>

      <div className="flex gap-8">
        <DetailField
          label="Created"
          className="flex-1"
          value={details.createdAt ? formatDateTime(details.createdAt, 'day') : undefined}
        />

        <DetailField
          label="Updated"
          className="flex-1"
          value={details.updatedAt ? formatDateTime(details.updatedAt, 'day') : undefined}
        />
      </div>

      <DetailField label="Description" value={details.description} />

      <div className="flex gap-8">
        <div className="flex flex-1 flex-col gap-0.5 text-xs">
          <span className="text-text-quaternary">Live Version</span>
          {details.liveVersion ? (
            <StatusBadge text={`v${details.liveVersion}`} status={StatusEnum.NotStarted} />
          ) : (
            <span>—</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-text-quaternary">Target Version</span>
          {details.targetVersion ? (
            <StatusBadge text={`v${details.targetVersion}`} status={StatusEnum.NotStarted} />
          ) : (
            <span>—</span>
          )}
        </div>
      </div>

      <DetailsCopyField label="Agent Runtime ARN" value={details.agentRuntimeArn} />
      <DetailsCopyField
        label="Agent Runtime Endpoint ARN"
        value={details.agentRuntimeEndpointArn}
      />

      {details.failureReason && (
        <DetailField label="Failure Reason" value={details.failureReason} />
      )}
    </div>
  )
}

interface Props {
  settingId: string
  runtimeId: string
  endpointName: string | null
  onHide: () => void
}

const AwsAgentCoreEndpointDetailsPopup: FC<Props> = ({
  settingId,
  runtimeId,
  endpointName,
  onHide,
}) => (
  <Popup
    header={endpointName || undefined}
    visible={!!endpointName}
    onHide={onHide}
    hideFooter
    className="w-[600px]"
  >
    {endpointName && (
      <Content settingId={settingId} runtimeId={runtimeId} endpointName={endpointName} />
    )}
  </Popup>
)

export default AwsAgentCoreEndpointDetailsPopup
