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

/**
 * AwsEntityDetails - A component for displaying AWS entity information
 * Renders details of an AWS vendor entity including name, ID, and description
 * Uses granular loading states to show loading indicator only when fetching this specific entity
 */
import { FC, useEffect, useState, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import vendorEntityUrl from '@/assets/images/aws/aws-entity.png'
import Spinner from '@/components/Spinner'
import { awsVendorStore } from '@/store/vendor'
import { VendorEntity, VendorEntityType, VendorOriginType } from '@/types/entity/vendor'

interface Props {
  originType?: VendorOriginType
  entityType?: VendorEntityType
  settingId?: string
  entityId?: string
  entityDetails?: VendorEntity | null
}

const AwsEntityDetails: FC<Props> = ({
  originType,
  entityType,
  settingId,
  entityId,
  entityDetails: propEntityDetails,
}) => {
  const [internalEntityDetails, setInternalEntityDetails] = useState<VendorEntity | null>(null)
  const { loading } = useSnapshot(awsVendorStore)

  const entity = propEntityDetails ?? internalEntityDetails

  const isLoading = useMemo(() => {
    return loading.details
  }, [loading.details])

  const fetchEntityDetails = async () => {
    if (!(originType && entityType && settingId && entityId)) return
    try {
      const entityDetails = await awsVendorStore.getVendorEntityDetails(
        originType,
        entityType,
        settingId,
        entityId
      )
      setInternalEntityDetails(entityDetails)
    } catch (error) {
      console.error('Failed to fetch entity details:', error)
    }
  }

  useEffect(() => {
    if (propEntityDetails === undefined) {
      fetchEntityDetails()
    }
  }, [originType, entityType, settingId, entityId, propEntityDetails])

  if (isLoading || !entity) {
    return <Spinner />
  }

  return (
    <div className="border-b border-border-structural rounded-md p-4 shadow-sm flex items-start justify-between gap-4">
      <img
        src={vendorEntityUrl}
        alt="vendor entity graphic"
        className="w-[72px] h-[72px] rounded-full"
      />
      <div className="flex-1">
        <div className="flex flex-row justify-between">
          <div>
            <h3 className="text-base font-medium mb-1">{entity.name}</h3>
            <div className="flex items-center gap-2 text-xs mb-3">
              {entity.id && (
                <div className="border border-border-structural rounded-xl px-2">
                  Id: {entity.id}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-text-quaternary mb-2">{entity.description}</p>
      </div>
    </div>
  )
}

export default AwsEntityDetails
