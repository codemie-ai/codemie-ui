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

import { useEffect, useState } from 'react'

import { analyticsStore } from '@/store/analytics'
import type {
  LeaderboardUserDetailQueryParams,
  LeaderboardUserDetailResponse,
} from '@/types/analytics'

interface UseLeaderboardUserDetailParams {
  userId: string | null
  snapshotId?: string
  extraParams?: LeaderboardUserDetailQueryParams
}

const useLeaderboardUserDetail = ({
  userId,
  snapshotId,
  extraParams,
}: UseLeaderboardUserDetailParams) => {
  const [data, setData] = useState<LeaderboardUserDetailResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCurrentRequest = true

    if (!userId) {
      setData(null)
      setLoading(false)
      setError(null)
    } else {
      const params: LeaderboardUserDetailQueryParams = { ...extraParams }

      if (snapshotId) {
        params.snapshot_id = snapshotId
      }

      setLoading(true)
      setError(null)

      analyticsStore
        .fetchLeaderboardUserDetail(userId, params)
        .then((result) => {
          if (!isCurrentRequest) return

          if (!result) {
            setError('Failed to load user details.')
            setData(null)
            return
          }

          setData(result)
        })
        .catch(() => {
          if (isCurrentRequest) {
            setError('Failed to load user details.')
            setData(null)
          }
        })
        .finally(() => {
          if (isCurrentRequest) setLoading(false)
        })
    }

    return () => {
      isCurrentRequest = false
    }
  }, [extraParams, snapshotId, userId])

  return { data, loading, error }
}

export default useLeaderboardUserDetail
