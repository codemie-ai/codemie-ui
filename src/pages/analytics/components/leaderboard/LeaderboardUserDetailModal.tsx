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

import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import type { LeaderboardUserDetailQueryParams } from '@/types/analytics'

import LeaderboardDimensionCard from './LeaderboardDimensionCard'
import LeaderboardSummaryMetrics from './LeaderboardSummaryMetrics'
import useLeaderboardUserDetail from './useLeaderboardUserDetail'
import UserDetailHeader from './UserDetailHeader'
import UserDimensionRadar from './UserDimensionRadar'

interface Props {
  userId: string | null
  snapshotId?: string
  extraParams?: LeaderboardUserDetailQueryParams
  onHide: () => void
}

const LeaderboardUserDetailModal: FC<Props> = ({ userId, snapshotId, extraParams, onHide }) => {
  const { data, loading, error } = useLeaderboardUserDetail({ userId, snapshotId, extraParams })

  const user = data?.data
  const dimensions = user?.dimensions ?? []
  const projects = user?.projects ?? []

  return (
    <Popup
      visible={!!userId}
      onHide={onHide}
      header="User Detail"
      hideFooter
      isFullWidth
      bodyClassName="max-h-[80vh] pb-6"
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner inline className="h-8 w-8" />
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center justify-center py-12">
          <p className="font-semibold text-failed-secondary">{error}</p>
        </div>
      )}

      {user && !loading && (
        <div className="flex flex-col gap-6">
          <UserDetailHeader user={user} />

          {projects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <span
                  key={project}
                  className="rounded-md bg-surface-base-tertiary px-2.5 py-1 text-xs text-text-secondary"
                >
                  {project}
                </span>
              ))}
            </div>
          )}

          {dimensions.length > 0 && <UserDimensionRadar dimensions={dimensions} />}

          {dimensions.length > 0 && (
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-quaternary">
                Score Breakdown & Evidence
              </h4>
              <div className="flex flex-col gap-2.5">
                {dimensions.map((dimension) => (
                  <LeaderboardDimensionCard key={dimension.id} dim={dimension} />
                ))}
              </div>
            </div>
          )}

          <LeaderboardSummaryMetrics summaryMetrics={user.summary_metrics} />
        </div>
      )}
    </Popup>
  )
}

export default LeaderboardUserDetailModal
