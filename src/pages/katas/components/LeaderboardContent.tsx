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

import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import Table from '@/components/Table'
import { katasStore } from '@/store/katas'
import { LeaderboardUser } from '@/types/entity/kata'
import { ColumnDefinition } from '@/types/table'

const getRankBadgeClass = (rank: number): string => {
  if (rank === 1) return 'bg-aborted-tertiary text-aborted-primary border-aborted-secondary'
  if (rank === 2) return 'bg-not-started-tertiary text-not-started-primary border-border-subtle'
  if (rank === 3) return 'bg-interrupted-tertiary text-interrupted-primary border-interrupted-secondary'
  return 'text-text-quaternary'
}

const RankCell = ({ rank }: { rank: number }) => {
  if (rank <= 3) {
    return (
      <div className="flex items-center justify-center">
        <span
          className={`px-3 py-1 rounded-lg text-sm font-semibold border ${getRankBadgeClass(rank)}`}
        >
          #{rank}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <span className="text-text-quaternary text-sm">#{rank}</span>
    </div>
  )
}

const CompletedCountCell = ({ count }: { count: number }) => (
  <div className="flex items-center justify-center">
    <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-success-secondary text-success-primary border border-success-primary">
      {count}
    </span>
  </div>
)

const InProgressCountCell = ({ count }: { count: number }) => (
  <div className="flex items-center justify-center">
    <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-in-progress-tertiary text-in-progress-primary border border-in-progress-secondary">
      {count}
    </span>
  </div>
)

const LeaderboardContent = () => {
  const { leaderboard, isLoading } = useSnapshot(katasStore)

  useEffect(() => {
    katasStore.fetchLeaderboard()
  }, [])

  const columnDefinitions: ColumnDefinition[] = useMemo(
    () => [
      {
        key: 'rank',
        label: 'Rank',
        type: 'custom',
        sortable: false,
        headClassNames: 'w-20 text-center',
      },
      {
        key: 'user_name',
        label: 'User Name',
        type: 'string',
        sortable: false,
        headClassNames: 'w-2/5',
      },
      {
        key: 'completed_count',
        label: 'Completed',
        type: 'custom',
        sortable: false,
        headClassNames: 'w-32 text-center',
      },
      {
        key: 'in_progress_count',
        label: 'In Progress',
        type: 'custom',
        sortable: false,
        headClassNames: 'w-32 text-center',
      },
    ],
    []
  )

  const customRenderColumns = {
    rank: (item: LeaderboardUser) => <RankCell rank={item.rank} />,
    completed_count: (item: LeaderboardUser) => <CompletedCountCell count={item.completed_count} />,
    in_progress_count: (item: LeaderboardUser) => (
      <InProgressCountCell count={item.in_progress_count} />
    ),
  }

  return (
    <section className="flex flex-col gap-6 pt-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary mb-2">Leaderboard</h2>
        <p className="text-text-tertiary mb-6">
          Top performers who have completed the most AI Katas challenges
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <p className="text-text-tertiary">Loading leaderboard...</p>
        </div>
      )}
      {!isLoading && leaderboard.length === 0 && (
        <div className="flex items-center justify-center p-8">
          <p className="text-text-tertiary">No leaderboard data available yet</p>
        </div>
      )}
      {!isLoading && leaderboard.length > 0 && (
        <Table
          items={leaderboard}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          idPath="user_id"
          loading={false}
          embedded={true}
        />
      )}
    </section>
  )
}

export default LeaderboardContent
