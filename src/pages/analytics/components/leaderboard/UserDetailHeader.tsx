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

import type { LeaderboardUserDetail } from '@/types/analytics'

import { getTierConfig, IntentBadge, TierBadge } from './helpers'

interface UserDetailHeaderProps {
  user: LeaderboardUserDetail
}

const UserDetailHeader: FC<UserDetailHeaderProps> = ({ user }) => {
  const tier = user.tier ?? getTierConfig(user.tier_name)

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        {user.tier ? (
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${user.tier.color}20`, color: user.tier.color }}
          >
            {user.tier.label}
          </span>
        ) : (
          <TierBadge tierName={user.tier_name} />
        )}
        <h3 className="text-xl font-bold text-text-primary">
          {user.user_name ?? user.user_email ?? '-'}
        </h3>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-text-quaternary">Rank #{user.rank ?? '-'}</span>
          <span
            className="rounded-lg px-3 py-1 text-2xl font-extrabold tabular-nums"
            style={{ backgroundColor: `${tier?.color}20`, color: tier?.color }}
          >
            {(user.total_score ?? 0).toFixed(1)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-text-quaternary">{user.user_email}</span>
        {user.intent ? (
          <span
            className="inline-flex rounded-[10px] px-2.5 py-1 text-[0.71rem] font-semibold tracking-wide"
            style={{ backgroundColor: `${user.intent.color}22`, color: user.intent.color }}
          >
            {user.intent.emoji} {user.intent.label}
          </span>
        ) : (
          user.usage_intent && <IntentBadge intentId={user.usage_intent} />
        )}
      </div>

      {user.intent?.description && (
        <p className="mt-2 text-xs leading-relaxed text-text-quaternary">
          {user.intent.description}
        </p>
      )}
    </div>
  )
}

export default UserDetailHeader
