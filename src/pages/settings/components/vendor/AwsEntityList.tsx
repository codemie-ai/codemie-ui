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
 * AwsEntityList - A component for displaying a list of AWS entities
 * Shows a grid of entities with basic information and actions
 * Uses granular loading states to show loading indicators only when fetching this specific list
 */
import React, { FC, useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import ChevronRightSvg from '@/assets/icons/chevron-right.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import vendorDataSourceUrl from '@/assets/images/aws/aws-datasource.png'
import vendorEntityUrl from '@/assets/images/aws/aws-entity.png'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { useVueRouter } from '@/hooks/useVueRouter'
import { awsVendorStore } from '@/store/vendor'
import { VendorEntity, VendorEntityType, VendorOriginType } from '@/types/entity/vendor'

interface Props {
  originType: VendorOriginType
  entityType: VendorEntityType
  settingId: string
  renderActions?: (entity: VendorEntity, entityType: VendorEntityType) => React.ReactNode
  actionsFullColumn?: boolean
}

const AwsEntityList: FC<Props> = ({
  originType,
  entityType,
  settingId,
  renderActions,
  actionsFullColumn,
}) => {
  const { vendorEntities, vendorEntitiesPagination, loading } = useSnapshot(awsVendorStore)
  const router = useVueRouter()

  // Use the specific loading state for entities
  const isLoading = loading.entities

  const entityLogoUrl = useMemo(() => {
    if (entityType === VendorEntityType.knowledgebases) {
      return vendorDataSourceUrl
    }
    return vendorEntityUrl
  }, [entityType])

  const onLoadMore = () => {
    awsVendorStore.getVendorEntities(originType, entityType, settingId, true)
  }

  const goToEntityDetails = (entity: VendorEntity) => {
    router.push({
      path: router.currentRoute.value.path + '/' + entity.id,
    })
  }

  const renderDefaultActions = (entity) => {
    return (
      <div className="flex gap-4 items-start">
        {entity.status === 'PREPARED' && (
          <Button type="secondary" onClick={() => goToEntityDetails(entity)}>
            More Info
            <ChevronRightSvg />
          </Button>
        )}
        {entity.status !== 'PREPARED' && (
          <div className="border border-border-structural rounded-md px-3 py-1 text-xs flex items-center gap-2 bg-surface-base-secondary">
            <InfoSvg />
            Not Prepared
          </div>
        )}
      </div>
    )
  }

  useEffect(() => {
    awsVendorStore.getVendorEntities(originType, entityType, settingId)
  }, [originType, entityType, settingId])

  return (
    <div className="pt-4">
      {!isLoading && vendorEntities.length === 0 && (
        <div className="text-center py-4">No entities found</div>
      )}
      <div className="grid gap-4 grid-cols-2">
        {vendorEntities.length > 0 &&
          vendorEntities.map((entity) => (
            <div
              key={entity.id}
              className="border border-border-structural rounded-md p-4 shadow-sm flex items-start justify-between gap-4"
            >
              <img
                src={entityLogoUrl}
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

                  {!actionsFullColumn &&
                    (renderActions
                      ? renderActions(entity, entityType)
                      : renderDefaultActions(entity))}
                </div>

                <p className="text-xs text-text-quaternary mb-2">{entity.description}</p>
              </div>

              {actionsFullColumn &&
                (renderActions ? renderActions(entity, entityType) : renderDefaultActions(entity))}
            </div>
          ))}
      </div>

      {isLoading && <Spinner inline />}

      {!isLoading && vendorEntities.length > 0 && vendorEntitiesPagination.nextToken && (
        <div className="mt-4 w-full flex justify-center">
          <Button onClick={onLoadMore} type="secondary">
            Load more...
          </Button>
        </div>
      )}
    </div>
  )
}

export default AwsEntityList
