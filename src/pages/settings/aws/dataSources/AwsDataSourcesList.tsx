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

import { FC, useState } from 'react'

import DeleteCloudSvg from '@/assets/icons/delete-cloud.svg?react'
import DownloadCloudSvg from '@/assets/icons/download-cloud.svg?react'
import OpenExternalSvg from '@/assets/icons/external.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import OpenSvg from '@/assets/icons/open.svg?react'
import Button from '@/components/Button'
import InfoBox from '@/components/form/InfoBox'
import Popup from '@/components/Popup'
import { useVueRouter } from '@/hooks/useVueRouter'
import AwsDataSourceDetailsPopup from '@/pages/settings/aws/dataSources/AwsDataSourceDetailsPopup'
import { awsVendorStore } from '@/store'
import { VendorEntity, VendorEntityType, VendorOriginType } from '@/types/entity/vendor'

import AwsEntityList from '../../components/vendor/AwsEntityList'

interface Props {
  settingId: string
}

const AwsDataSourcesList: FC<Props> = ({ settingId }) => {
  const router = useVueRouter()
  const [entityToUninstall, setEntityToUninstall] = useState<VendorEntity | null>(null)
  const [entityToShowDetails, setEntityToShowDetails] = useState<VendorEntity | null>(null)

  const installEntity = async (entity: VendorEntity) => {
    await awsVendorStore.installVendorEntity(
      VendorOriginType.AWS,
      VendorEntityType.knowledgebases,
      {
        id: entity.id,
        settingId,
      }
    )
    await awsVendorStore.getVendorEntities(
      VendorOriginType.AWS,
      VendorEntityType.knowledgebases,
      settingId
    )
  }

  const goToCodemie = (entity: VendorEntity) => {
    router.push({ name: 'data-source-details', params: { id: entity.aiRunId } })
  }

  const openEntityDetails = (entity: VendorEntity) => {
    setEntityToShowDetails(entity)
  }

  const uninstallEntityConfirm = async (entity: VendorEntity) => {
    setEntityToUninstall(null)
    if (!entity.aiRunId) {
      return
    }

    await awsVendorStore.uninstallVendorEntity(
      VendorOriginType.AWS,
      VendorEntityType.knowledgebases,
      entity.aiRunId
    )
    await awsVendorStore.getVendorEntities(
      VendorOriginType.AWS,
      VendorEntityType.knowledgebases,
      settingId
    )
  }

  const uninstallEntity = (entity: VendorEntity) => {
    setEntityToUninstall(entity)
  }

  const renderActions = (entity: VendorEntity) => {
    return (
      <div className="flex flex-col gap-4 items-end">
        {!entity.aiRunId && entity.status === 'NOT_PREPARED' && (
          <div className="border border-border-structural rounded-md px-3 py-1 text-xs flex items-center gap-2 bg-surface-base-secondary">
            <InfoSvg />
            Not Prepared
          </div>
        )}
        {!entity.aiRunId && entity.status === 'PREPARED' && (
          <Button onClick={() => installEntity(entity)}>
            <DownloadCloudSvg />
            Install
          </Button>
        )}
        {entity.aiRunId && (
          <Button onClick={() => uninstallEntity(entity)}>
            <DeleteCloudSvg />
            Uninstall
          </Button>
        )}
        {entity.status === 'PREPARED' && (
          <Button onClick={() => openEntityDetails(entity)} type="secondary">
            <OpenSvg />
            Details
          </Button>
        )}
        {entity.aiRunId && (
          <Button type="secondary" onClick={() => goToCodemie(entity)}>
            <OpenExternalSvg />
            Open in Codemie
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <AwsEntityList
        originType={VendorOriginType.AWS}
        entityType={VendorEntityType.knowledgebases}
        settingId={settingId}
        renderActions={renderActions}
        actionsFullColumn
      />

      <AwsDataSourceDetailsPopup
        visible={!!entityToShowDetails}
        onHide={() => setEntityToShowDetails(null)}
        settingId={settingId}
        entityId={entityToShowDetails?.id as string}
      />

      <Popup
        visible={!!entityToUninstall}
        onHide={() => setEntityToUninstall(null)}
        submitText="Uninstall"
        header="Uninstall Knowledge Base"
        onSubmit={() => entityToUninstall && uninstallEntityConfirm(entityToUninstall)}
      >
        <div className="pb-6 max-w-[500px]">
          <div className="text-sm mb-4 text-text-primary">
            You’re about to remove this knowledge base from your workspace.
          </div>
          <h3 className="text-base font-medium text-text-primary">{entityToUninstall?.name}</h3>
          <div className="flex items-center gap-2 text-text-quaternary text-xs mt-2 mb-4">
            <div className="border border-border-structural rounded-xl px-2 text-text-primary">
              Id: {entityToUninstall?.id}
            </div>
          </div>

          <InfoBox
            text={
              <span className="text-aborted-primary">
                This action may affect ongoing workflows and connected resources. Please confirm
                that it won’t disrupt your team’s work before proceeding.
              </span>
            }
            iconClassName="stroke-aborted-primary fill-aborted-primary"
          />
        </div>
      </Popup>
    </>
  )
}

export default AwsDataSourcesList
