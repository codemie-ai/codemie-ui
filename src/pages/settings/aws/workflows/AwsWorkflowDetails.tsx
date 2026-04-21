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

import InfoBox from '@/components/form/InfoBox'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import { useVueRouter } from '@/hooks/useVueRouter'
import AwsEntityDetails from '@/pages/settings/components/vendor/AwsEntityDetails'
import AwsEntityVersionList from '@/pages/settings/components/vendor/AwsEntityVersionList'
import { awsVendorStore } from '@/store/vendor'
import { VendorEntityType, VendorInstallableVersion, VendorOriginType } from '@/types/entity/vendor'
import { formatDateTime } from '@/utils/helpers'
import { getInstallableVersionFromAlias } from '@/utils/vendor'

interface Props {
  settingId: string
  entityId: string
}

const AwsWorkflowDetails: FC<Props> = ({ settingId, entityId }) => {
  const { loading, vendorAliases, vendorAliasesPagination } = useSnapshot(awsVendorStore)
  const isLoading = loading.aliases
  const originType = VendorOriginType.AWS
  const entityType = VendorEntityType.workflows
  const router = useVueRouter()
  const [versionToUninstall, setVersionToUninstall] = useState<VendorInstallableVersion | null>(
    null
  )

  const installableVersions = vendorAliases.map(getInstallableVersionFromAlias)

  const installVersion = async (version: VendorInstallableVersion) => {
    await awsVendorStore.installVendorEntity(originType, entityType, {
      id: entityId,
      flowAliasId: version.aliasId,
      settingId,
    })
    await awsVendorStore.getVendorAliases(originType, entityType, settingId, entityId)
  }

  const uninstallVersionConfirm = async (version: VendorInstallableVersion) => {
    setVersionToUninstall(null)
    if (!version.aiRunId) {
      return
    }

    await awsVendorStore.uninstallVendorEntity(originType, entityType, version.aiRunId)
    await awsVendorStore.getVendorAliases(originType, entityType, settingId, entityId)
  }

  const uninstallVersion = (version: VendorInstallableVersion) => {
    setVersionToUninstall(version)
  }

  const goToCodemie = (version: VendorInstallableVersion) => {
    router.push({ name: 'view-workflow', params: { workflowId: version.aiRunId } })
  }

  useEffect(() => {
    awsVendorStore.getVendorAliases(originType, entityType, settingId, entityId)
  }, [originType, entityType, settingId, entityId])

  if (isLoading) {
    return <Spinner />
  }

  return (
    <div>
      <AwsEntityDetails
        originType={originType}
        entityType={entityType}
        settingId={settingId}
        entityId={entityId}
      />

      <h2 className="text-sm mt-5">Available flows</h2>

      <AwsEntityVersionList
        versions={installableVersions}
        loading={isLoading}
        hasMore={!!vendorAliasesPagination.nextToken}
        loadMore={() =>
          awsVendorStore.getVendorAliases(originType, entityType, settingId, entityId, true)
        }
        installVersion={installVersion}
        uninstallVersion={uninstallVersion}
        goToCodemie={goToCodemie}
      />

      <Popup
        visible={!!versionToUninstall}
        onHide={() => setVersionToUninstall(null)}
        submitText="Uninstall"
        header="Uninstall Workflow"
        onSubmit={() => versionToUninstall && uninstallVersionConfirm(versionToUninstall)}
      >
        <div className="pb-6 max-w-[500px]">
          <div className="text-sm mb-4 text-text-primary">
            You’re about to remove this workflow version from your workspace.
          </div>
          <h3 className="text-sm font-medium text-text-primary">
            Alias Id: {versionToUninstall?.aliasId}
          </h3>
          <div className="flex items-center gap-2 text-text-quaternary text-sm mt-2 mb-4">
            <div className="">Version: {versionToUninstall?.versionId} /</div>
            <div>{formatDateTime(versionToUninstall?.updatedAt, 'day')}</div>
          </div>

          <InfoBox
            text={
              <span className="text-aborted-primary">
                This action may affect ongoing processes and connected resources. Please confirm
                that it won’t disrupt your team’s work before proceeding.
              </span>
            }
            iconClassName="stroke-aborted-primary fill-aborted-primary"
          />
        </div>
      </Popup>
    </div>
  )
}

export default AwsWorkflowDetails
