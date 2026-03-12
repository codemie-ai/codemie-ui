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
import { VendorKnowledgeBaseEntityDetails, VendorOriginType } from '@/types/entity/vendor'
import { formatDate, HUMAN_DAY_FORMAT } from '@/utils/utils'

interface Props {
  settingId: string
  entityId: string
  visible: boolean
  onHide: () => void
}

const AwsDataSourcesEntityDetailsPopup: FC<Props> = ({ settingId, entityId, visible, onHide }) => {
  const { loading } = useSnapshot(awsVendorStore)
  const isLoading = loading.details
  const originType = VendorOriginType.AWS

  const [entityDetails, setEntityDetails] = useState<VendorKnowledgeBaseEntityDetails | null>(null)

  useEffect(() => {
    async function fetchEntityDetails() {
      if (visible && entityId) {
        try {
          const details = await awsVendorStore.getVendorKnowledgeBaseDetails(
            originType,
            settingId,
            entityId
          )
          setEntityDetails(details)
        } catch (error) {
          console.error('Failed to fetch version details', error)
        }
      }
    }

    fetchEntityDetails()
  }, [visible, entityId, settingId])

  const handleClose = () => {
    onHide()
    setEntityDetails(null)
  }

  return (
    <Popup
      visible={visible}
      onHide={handleClose}
      header={`Data Source: ${entityDetails?.name || ''} / ${formatDate(
        entityDetails?.updatedAt,
        HUMAN_DAY_FORMAT
      )}`}
      hideFooter
    >
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner inline />
        </div>
      )}

      {!isLoading && entityDetails && (
        <div className="p-4">
          <div className="mb-4">
            <div className="flex flex-col">
              <span className="text-xs">Description:</span>
              <span className="text-sm font-medium text-text-quaternary">
                {entityDetails.description}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-4">
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <span className="text-xs w-[120px]">Type:</span>
                <span className="text-sm font-medium border border-border-structural rounded-md px-2 py-0.5 bg-surface-base-primary">
                  {entityDetails.type}
                </span>
              </div>

              {entityDetails.type === 'KENDRA' ? (
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-[120px]">Index ARN:</span>
                  <span className="text-sm font-medium border border-border-structural rounded-md px-2 py-0.5 bg-surface-base-primary">
                    {entityDetails.kendraIndexArn}
                  </span>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <span className="text-xs w-[120px]">Embedding Model:</span>
                  <span className="text-sm font-medium border border-border-structural rounded-md px-2 py-0.5 bg-surface-base-primary">
                    {entityDetails.embeddingModel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoading && !entityDetails && visible && (
        <div className="text-center py-8 text-text-quaternary">
          No details available for this version
        </div>
      )}
    </Popup>
  )
}

export default AwsDataSourcesEntityDetailsPopup
