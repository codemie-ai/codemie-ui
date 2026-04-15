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

import { FC } from 'react'

import DeleteCloudSvg from '@/assets/icons/delete-cloud.svg?react'
import DownloadCloudSvg from '@/assets/icons/download-cloud.svg?react'
import OpenExternalSvg from '@/assets/icons/external.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import OpenSvg from '@/assets/icons/open.svg?react'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { VendorInstallableVersion } from '@/types/entity/vendor'
import { formatDateTime } from '@/utils/helpers'

interface Props {
  openInCodemieLabel?: string
  versions: VendorInstallableVersion[]
  loading: boolean
  hasMore: boolean
  loadMore: () => void
  installVersion: (version: VendorInstallableVersion) => void
  uninstallVersion: (version: VendorInstallableVersion) => void
  goToCodemie?: (version: VendorInstallableVersion) => void
  openVersionDetails?: (version: VendorInstallableVersion) => void
}

const AwsEntityVersionList: FC<Props> = ({
  openInCodemieLabel = 'Open in Codemie',
  versions,
  loading,
  hasMore,
  loadMore,
  installVersion,
  uninstallVersion,
  goToCodemie,
  openVersionDetails,
}) => {
  return (
    <div className="pt-4">
      {!loading && versions.length === 0 && (
        <div className="text-center py-4">No versions available</div>
      )}
      <div className="grid gap-4 grid-cols-1">
        {versions.length > 0 &&
          versions.map((version) => (
            <div
              key={version.versionId}
              className="border border-border-structural rounded-lg p-4 shadow-sm flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  {version.aliasId ? (
                    <h3 className="text-sm font-medium text-text-primary">
                      Alias Id: {version.aliasId}
                    </h3>
                  ) : (
                    <h3 className="text-sm font-medium text-text-primary">
                      Version: {version.versionId}
                    </h3>
                  )}
                  <div className="flex items-center gap-2 text-text-quaternary text-xs mt-2">
                    {version.aliasId && <div className="">Version: {version.versionId} /</div>}
                    <div>{formatDateTime(version.updatedAt, 'day')}</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {version.aiRunId && goToCodemie && (
                    <Button onClick={() => goToCodemie(version)} type="secondary">
                      <OpenExternalSvg />
                      {openInCodemieLabel}
                    </Button>
                  )}
                  {openVersionDetails && version.status === 'PREPARED' && (
                    <Button onClick={() => openVersionDetails(version)} type="secondary">
                      <OpenSvg />
                      Version Details
                    </Button>
                  )}
                  {!version.aiRunId && version.status === 'PREPARED' && (
                    <Button onClick={() => installVersion(version)} type="primary">
                      <DownloadCloudSvg />
                      Install
                    </Button>
                  )}
                  {!version.aiRunId && version.status === 'NOT_PREPARED' && (
                    <div className="border border-border-structural rounded-md px-3 py-1 text-xs flex items-center gap-2 bg-surface-base-secondary">
                      <InfoSvg />
                      Not Prepared
                    </div>
                  )}
                  {version.aiRunId && (
                    <Button onClick={() => uninstallVersion(version)} type="primary">
                      <DeleteCloudSvg />
                      Uninstall
                    </Button>
                  )}
                </div>
              </div>

              {version.description && (
                <p className="text-xs text-text-quaternary mt-4">{version.description}</p>
              )}
            </div>
          ))}
      </div>

      {loading && <Spinner inline />}

      {!loading && versions.length > 0 && hasMore && (
        <div className="mt-4 w-full flex justify-center">
          <Button onClick={loadMore} type="secondary">
            Load more ...
          </Button>
        </div>
      )}
    </div>
  )
}

export default AwsEntityVersionList
