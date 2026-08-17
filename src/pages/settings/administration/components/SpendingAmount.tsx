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

import { getHardLimitSpendColor } from '@/pages/settings/administration/projectsManagement/components/budgetSpending'
import { formatSpend } from '@/utils/currency'

interface SpendingAmountProps {
  spend?: number | null
  limit?: number | null
}

/**
 * One category's spend and limit, rendered inline as `spend / limit` and colored against
 * the limit. No limit configured means no threshold color — never a false "over budget" signal.
 */
const SpendingAmount: FC<SpendingAmountProps> = ({ spend, limit }) => {
  const color = spend != null ? getHardLimitSpendColor(spend, limit) : null

  return (
    <span className="whitespace-nowrap text-text-primary" style={color ? { color } : undefined}>
      {formatSpend(spend)} / {formatSpend(limit)}
    </span>
  )
}

export default SpendingAmount
