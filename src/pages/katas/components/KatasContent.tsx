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

import { KATA_FILTER_TYPE } from '@/constants/katas'
import { KataFilters } from '@/types/entity/kata'

import { KatasCategory } from '../KatasPage'
import AIKatasContent from './AIKatasContent'
import LeaderboardContent from './LeaderboardContent'

interface KatasContentProps {
  activeCategory: KatasCategory
  filters?: KataFilters
  reloadKatas?: () => void
  hasPagination?: boolean
  totalCount?: number
}

const KatasContent = ({ activeCategory, filters, reloadKatas, totalCount }: KatasContentProps) => {
  const renderContent = () => {
    switch (activeCategory) {
      case KatasCategory.ALL_KATAS:
        return (
          <AIKatasContent
            filterType={KATA_FILTER_TYPE.ALL}
            filters={filters}
            reloadKatas={reloadKatas}
            totalCount={totalCount}
          />
        )
      case KatasCategory.IN_PROGRESS:
        return <AIKatasContent filterType={KATA_FILTER_TYPE.IN_PROGRESS} />
      case KatasCategory.COMPLETED:
        return <AIKatasContent filterType={KATA_FILTER_TYPE.COMPLETED} />
      case KatasCategory.LEADERBOARD:
        return <LeaderboardContent />
      default:
        return null
    }
  }

  return renderContent()
}

export default KatasContent
