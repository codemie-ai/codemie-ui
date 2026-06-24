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
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge/StatusBadge'
import AwsEntityDetails from '@/pages/settings/components/vendor/AwsEntityDetails'
import { assistantsStore } from '@/store/assistants'
import { chatsStore } from '@/store/chats'
import { awsVendorStore } from '@/store/vendor'
import {
  VendorAgentCoreEndpoint,
  VendorAgentCoreRuntime,
  VendorEntityType,
  VendorOriginType,
  AgentCoreEndpointStatus,
} from '@/types/entity/vendor'
import { formatDateTime } from '@/utils/helpers'

import { IMPORT_MODES, ImportMode, RUNTIME_BADGE_MAP } from '../constants'
import AwsAgentCoreEndpointDetailsPopup from './AwsAgentCoreEndpointDetailsPopup'
import AwsAgentCoreEndpointRow from './AwsAgentCoreEndpointRow'
import AwsAgentCoreImportPopup from './AwsAgentCoreImportPopup'

interface Props {
  settingId: string
  entityId: string
}

const AwsAgentCoreRuntimeDetails: FC<Props> = ({ settingId, entityId }) => {
  const navigate = useNavigate()
  const { loading, agentCoreEndpoints, agentCoreEndpointsPagination } = useSnapshot(awsVendorStore)
  const [runtime, setRuntime] = useState<VendorAgentCoreRuntime | null>(null)
  const [selectedEndpointName, setSelectedEndpointName] = useState<string | null>(null)
  const [importingEndpoint, setImportingEndpoint] = useState<VendorAgentCoreEndpoint | null>(null)
  const [importMode, setImportMode] = useState<ImportMode>(IMPORT_MODES.INSTALL)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await awsVendorStore.getVendorEntityDetails(
          VendorOriginType.AWS,
          VendorEntityType.agentcoreRuntimes,
          settingId,
          entityId
        )
        setRuntime(data as unknown as VendorAgentCoreRuntime)
      } catch (error) {
        console.error('Failed to fetch runtime details:', error)
      }
    }
    fetchDetails()
  }, [settingId, entityId])

  useEffect(() => {
    awsVendorStore.getAgentCoreEndpoints(settingId, entityId)
  }, [settingId, entityId])

  const refreshEndpoints = () => awsVendorStore.getAgentCoreEndpoints(settingId, entityId)

  const handleDelete = async (endpoint: VendorAgentCoreEndpoint) => {
    if (!endpoint.aiRunId) return
    setActioningId(endpoint.name)
    try {
      await awsVendorStore.deleteAgentCoreEndpoint(endpoint.aiRunId)
      await refreshEndpoints()
    } finally {
      setActioningId(null)
    }
  }

  const enrichWithAssistant = async (
    endpoint: VendorAgentCoreEndpoint
  ): Promise<VendorAgentCoreEndpoint> => {
    if (!endpoint.aiRunId) return endpoint
    try {
      const assistant = await assistantsStore.getAssistant(endpoint.aiRunId, true)
      return {
        ...endpoint,
        assistantName: assistant.name,
        assistantDescription: assistant.description,
      }
    } catch {
      return endpoint
    }
  }

  const handleReinstall = async (endpoint: VendorAgentCoreEndpoint) => {
    const enriched = await enrichWithAssistant(endpoint)
    setImportMode(IMPORT_MODES.REINSTALL)
    setImportingEndpoint(enriched)
  }

  const handleChat = async (endpoint: VendorAgentCoreEndpoint) => {
    if (!endpoint.aiRunId) return
    await chatsStore.startNewChat(endpoint.aiRunId)
    navigate('/chats')
  }

  if (!runtime) {
    return <Spinner />
  }

  const { text: statusText, statusEnum } =
    RUNTIME_BADGE_MAP[runtime.status ?? AgentCoreEndpointStatus.NOT_PREPARED]

  const runtimeInfo = (
    <>
      {runtime.updatedAt && (
        <span className="text-text-quaternary">
          Updated: {formatDateTime(runtime.updatedAt, 'day')}
        </span>
      )}
      <div className="flex flex-row gap-2">
        <StatusBadge status={statusEnum} text={statusText} />
        {runtime.version && (
          <StatusBadge text={`v${runtime.version}`} status={StatusEnum.Success} />
        )}
      </div>
    </>
  )

  return (
    <div className="flex flex-col gap-4 pb-4">
      <AwsEntityDetails entityDetails={runtime} additionalInfo={runtimeInfo} />

      <div>
        <h4 className="text-sm font-medium mb-3">Endpoints</h4>
        {loading.agentCoreEndpoints && !agentCoreEndpoints.length && <Spinner inline />}
        {!loading.agentCoreEndpoints && !agentCoreEndpoints.length && (
          <div className="text-sm text-text-quaternary text-center py-4">No endpoints found</div>
        )}

        <div className="flex flex-col gap-2">
          {agentCoreEndpoints.map((endpoint) => (
            <AwsAgentCoreEndpointRow
              key={endpoint.name}
              endpoint={endpoint}
              onDetails={() => setSelectedEndpointName(endpoint.name)}
              onImport={() => {
                setImportMode(IMPORT_MODES.INSTALL)
                setImportingEndpoint(endpoint)
              }}
              onDelete={() => handleDelete(endpoint)}
              onReinstall={() => handleReinstall(endpoint)}
              onConfigure={async () => {
                const enriched = await enrichWithAssistant(endpoint)
                setImportMode(IMPORT_MODES.CONFIGURE)
                setImportingEndpoint(enriched)
              }}
              onChat={() => handleChat(endpoint)}
              isActioning={actioningId === endpoint.name}
            />
          ))}
        </div>

        {loading.agentCoreEndpoints && agentCoreEndpoints.length > 0 && !actioningId && (
          <Spinner inline />
        )}
        {!loading.agentCoreEndpoints && agentCoreEndpointsPagination.nextToken && (
          <div className="mt-3 flex justify-center">
            <Button
              type="secondary"
              onClick={() => awsVendorStore.getAgentCoreEndpoints(settingId, entityId, true)}
            >
              Load more...
            </Button>
          </div>
        )}
      </div>

      <AwsAgentCoreEndpointDetailsPopup
        settingId={settingId}
        runtimeId={entityId}
        endpointName={selectedEndpointName}
        onHide={() => setSelectedEndpointName(null)}
      />

      <AwsAgentCoreImportPopup
        settingId={settingId}
        runtimeId={entityId}
        endpoint={importingEndpoint}
        mode={importMode}
        onHide={() => {
          setImportingEndpoint(null)
          setImportMode(IMPORT_MODES.INSTALL)
        }}
        onSuccess={async () => {
          const name = importingEndpoint?.name ?? null
          setImportingEndpoint(null)
          setImportMode(IMPORT_MODES.INSTALL)
          if (name) setActioningId(name)
          try {
            await refreshEndpoints()
          } finally {
            setActioningId(null)
          }
        }}
      />
    </div>
  )
}

export default AwsAgentCoreRuntimeDetails
