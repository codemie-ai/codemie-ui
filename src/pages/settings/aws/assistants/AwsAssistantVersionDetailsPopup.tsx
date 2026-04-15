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
import { useSnapshot } from 'valtio'

import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { awsVendorStore } from '@/store/vendor'
import {
  VendorAgentVersionDetails,
  VendorEntityType,
  VendorOriginType,
} from '@/types/entity/vendor'
import { formatDateTime } from '@/utils/helpers'

interface Props {
  settingId: string
  entityId: string
  versionId: string | null
  visible: boolean
  onHide: () => void
}

const AwsAssistantVersionDetailsPopup: FC<Props> = ({
  settingId,
  entityId,
  versionId,
  visible,
  onHide,
}) => {
  const { loading } = useSnapshot(awsVendorStore)
  const isLoading = loading.versionDetails
  const originType = VendorOriginType.AWS
  const entityType = VendorEntityType.assistant

  const [versionData, setVersionData] = useState<VendorAgentVersionDetails | null>(null)

  useEffect(() => {
    async function fetchVersionDetails() {
      if (visible && versionId) {
        try {
          const details = await awsVendorStore.getVendorAgentVersionDetails(
            originType,
            entityType,
            settingId,
            entityId,
            versionId
          )
          setVersionData(details)
        } catch (error) {
          console.error('Failed to fetch version data', error)
        }
      }
    }

    fetchVersionDetails()
  }, [visible, versionId, entityId, settingId])

  const handleClose = () => {
    onHide()
    setVersionData(null)
  }

  return (
    <Popup
      visible={visible}
      hideFooter
      onHide={handleClose}
      header={`Version: ${versionData?.version || ''} / ${formatDateTime(
        versionData?.updatedAt,
        'day'
      )}`}
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner inline />
        </div>
      )}

      {!isLoading && versionData && (
        <div className="p-4">
          <div className="mb-4">
            <div className="flex flex-col">
              <span className="text-xs ">Description:</span>
              <span className="text-sm font-medium text-text-quaternary">
                {versionData.description}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-4">
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <span className="text-xs">LLM Model:</span>
                <span className="text-sm font-medium border border-border-structural rounded-md px-2 py-0.5 bg-surface-base-primary">
                  {versionData.foundationModel}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-xs  bg-surface-elevated py-2 px-4 rounded-t-md">
                  Instruction
                </span>
                <div className="text-sm border border-surface-elevated rounded-b py-2 px-4 max-h-32 overflow-y-auto">
                  {versionData.instruction}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !versionData && visible && (
        <div className="text-center py-8 text-text-quaternary">
          No details available for this version
        </div>
      )}
    </Popup>
  )
}

export default AwsAssistantVersionDetailsPopup
