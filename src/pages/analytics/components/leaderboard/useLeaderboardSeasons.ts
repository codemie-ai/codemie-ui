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

import { useEffect, useRef, useState } from 'react'

import { analyticsStore } from '@/store/analytics'
import type { LeaderboardSeason, LeaderboardView } from '@/types/analytics'

interface UseLeaderboardSeasonsResult {
  seasonKey: string | undefined
  seasons: LeaderboardSeason[]
  seasonsLoading: boolean
  setSeasonKey: (seasonKey: string | undefined) => void
}

export const useLeaderboardSeasons = (view: LeaderboardView): UseLeaderboardSeasonsResult => {
  const [seasonKey, setSeasonKey] = useState<string | undefined>(undefined)
  const [seasons, setSeasons] = useState<LeaderboardSeason[]>([])
  const [seasonsLoading, setSeasonsLoading] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current

    if (view === 'current') {
      setSeasons([])
      setSeasonKey(undefined)
      setSeasonsLoading(false)
      return
    }

    setSeasonsLoading(true)

    analyticsStore
      .fetchLeaderboardSeasons(view)
      .then((nextSeasons) => {
        if (requestId !== requestIdRef.current) {
          return
        }

        setSeasons(nextSeasons)
        setSeasonKey((currentSeasonKey) => {
          if (
            currentSeasonKey &&
            nextSeasons.some((season) => season.season_key === currentSeasonKey)
          ) {
            return currentSeasonKey
          }

          return nextSeasons[0]?.season_key
        })
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) {
          return
        }

        setSeasons([])
        setSeasonKey(undefined)
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setSeasonsLoading(false)
        }
      })
  }, [view])

  return {
    seasonKey,
    seasons,
    seasonsLoading,
    setSeasonKey,
  }
}
