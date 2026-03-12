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
import GuardrailAssignmentPopup from '@/components/guardrails/GuardrailAssignmentPopup/GuardrailAssignmentPopup'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import AwsEntityDetails from '@/pages/settings/components/vendor/AwsEntityDetails'
import AwsEntityVersionList from '@/pages/settings/components/vendor/AwsEntityVersionList'
import { awsVendorStore } from '@/store/vendor'
import {
  VendorEntity,
  VendorEntityType,
  VendorInstallableVersion,
  VendorOriginType,
} from '@/types/entity/vendor'
import { formatDate, HUMAN_DAY_FORMAT } from '@/utils/utils'
import { getInstallableVersionFromVersion } from '@/utils/vendor'

import AwsGuardrailVersionDetailsPopup from './AwsGuardrailVersionDetailsPopup'

interface Props {
  settingId: string
  entityId: string
}

const AwsGuardrailDetails: FC<Props> = ({ settingId, entityId }) => {
  const { loading, vendorVersions, vendorVersionsPagination } = useSnapshot(awsVendorStore)
  const isLoading = loading.versions || loading.details
  const originType = VendorOriginType.AWS
  const entityType = VendorEntityType.guardrails
  const [versionToUninstall, setVersionToUninstall] = useState<VendorInstallableVersion | null>(
    null
  )
  const [versionToShowDetails, setVersionToShowDetails] = useState<VendorInstallableVersion | null>(
    null
  )
  const [showAssignments, setShowAssignments] = useState(false)
  const [selectedVersionForAssignments, setSelectedVersionForAssignments] =
    useState<VendorInstallableVersion | null>(null)
  const [entityDetails, setEntityDetails] = useState<VendorEntity | null>(null)

  const installableVersions = vendorVersions.map(getInstallableVersionFromVersion)

  const installVersion = async (version: VendorInstallableVersion) => {
    await awsVendorStore.installVendorEntity(originType, entityType, {
      id: entityId,
      version: version.versionId,
      settingId,
    })
    await awsVendorStore.getVendorVersions(originType, entityType, settingId, entityId)
  }

  const uninstallVersionConfirm = async (version: VendorInstallableVersion) => {
    setVersionToUninstall(null)
    if (!version.aiRunId) {
      return
    }

    await awsVendorStore.uninstallVendorEntity(originType, entityType, version.aiRunId)
    await awsVendorStore.getVendorVersions(originType, entityType, settingId, entityId)
  }

  const uninstallVersion = (version: VendorInstallableVersion) => {
    setVersionToUninstall(version)
  }

  const openVersionDetails = (version: VendorInstallableVersion) => {
    setVersionToShowDetails(version)
    setSelectedVersionForAssignments(version)
  }

  const goToCodemie = (version: VendorInstallableVersion) => {
    setSelectedVersionForAssignments(version)
    setShowAssignments(true)
  }

  const handleHideAssignments = () => {
    setShowAssignments(false)
    setSelectedVersionForAssignments(null)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        await awsVendorStore.getVendorVersions(originType, entityType, settingId, entityId)
        const details = await awsVendorStore.getVendorEntityDetails(
          originType,
          entityType,
          settingId,
          entityId
        )
        setEntityDetails(details)
      } catch (error) {
        console.error('Failed to fetch guardrail details:', error)
      }
    }

    fetchData()
  }, [originType, entityType, settingId, entityId])

  if (isLoading || !entityDetails) {
    return <Spinner />
  }

  return (
    <div>
      <AwsEntityDetails entityDetails={entityDetails} />

      <h2 className="text-sm mt-5">Available versions</h2>

      <AwsEntityVersionList
        openInCodemieLabel="Open Codemie Configuration"
        versions={installableVersions}
        loading={isLoading}
        hasMore={!!vendorVersionsPagination.nextToken}
        loadMore={() =>
          awsVendorStore.getVendorVersions(originType, entityType, settingId, entityId, true)
        }
        installVersion={installVersion}
        uninstallVersion={uninstallVersion}
        openVersionDetails={openVersionDetails}
        goToCodemie={goToCodemie}
      />

      <AwsGuardrailVersionDetailsPopup
        visible={!!versionToShowDetails}
        onHide={() => setVersionToShowDetails(null)}
        settingId={settingId}
        entityId={entityId}
        versionId={versionToShowDetails?.versionId || null}
      />

      <Popup
        visible={!!versionToUninstall}
        onHide={() => setVersionToUninstall(null)}
        submitText="Uninstall"
        header="Uninstall Guardrail"
        onSubmit={() => versionToUninstall && uninstallVersionConfirm(versionToUninstall)}
      >
        <div className="pb-6 max-w-[500px]">
          <div className="text-sm mb-4 text-text-primary">
            You’re about to remove this guardrail version from your workspace.
          </div>
          <div className="flex items-center gap-2 text-text-quaternary text-xs mt-2 mb-4">
            <div className="">Version: {versionToUninstall?.versionId} /</div>
            <div>{formatDate(versionToUninstall?.updatedAt, HUMAN_DAY_FORMAT)}</div>
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

      <GuardrailAssignmentPopup
        visible={showAssignments}
        onHide={handleHideAssignments}
        guardrailId={selectedVersionForAssignments?.aiRunId}
        guardrailName={entityDetails.name}
      />
    </div>
  )
}

export default AwsGuardrailDetails
