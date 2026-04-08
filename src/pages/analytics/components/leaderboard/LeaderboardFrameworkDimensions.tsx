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

import { FC, useCallback, useEffect, useState } from 'react'

import Spinner from '@/components/Spinner'
import { analyticsStore } from '@/store/analytics'
import type { LeaderboardFrameworkResponse, LeaderboardFrameworkDimension } from '@/types/analytics'

import DimensionDetailModal from './DimensionDetailModal'
import FrameworkDimensionCard from './FrameworkDimensionCard'

const LeaderboardFrameworkDimensions: FC = () => {
  const [framework, setFramework] = useState<LeaderboardFrameworkResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDimension, setSelectedDimension] = useState<LeaderboardFrameworkDimension | null>(
    null
  )

  const fetchFramework = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await analyticsStore.fetchLeaderboardFramework()
      setFramework(result)
      if (!result) setError('Failed to load framework data.')
    } catch (err) {
      console.error('Failed to fetch leaderboard framework:', err)
      setError('Failed to load framework data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFramework().catch(console.error)
  }, [fetchFramework])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner inline className="h-6 w-6" />
      </div>
    )
  }

  if (error) {
    return <p className="text-xs text-text-quaternary italic py-4">{error}</p>
  }

  const dimensions = framework?.data?.dimensions
  if (!dimensions) return null

  const dimensionList = Object.values(dimensions).sort((a, b) => {
    const aNum = parseInt(a.id.replace('d', ''), 10)
    const bNum = parseInt(b.id.replace('d', ''), 10)
    return aNum - bNum
  })

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {dimensionList.map((dim) => (
          <FrameworkDimensionCard
            key={dim.id}
            dimension={dim}
            onClick={() => setSelectedDimension(dim)}
          />
        ))}
      </div>

      <DimensionDetailModal
        dimension={selectedDimension}
        onHide={() => setSelectedDimension(null)}
      />
    </>
  )
}

export default LeaderboardFrameworkDimensions
