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
import { SpendQualification } from '@/types/analytics'
import { formatSpendQualificationSuffix } from '@/utils/analyticsFormatters'
import { formatSpend } from '@/utils/currency'

interface SpendingAmountProps {
  spend?: number | null
  limit?: number | null
  qualification?: SpendQualification
}

/**
 * One category's spend and limit, rendered inline as `spend / limit` and colored against
 * the limit. No limit configured means no threshold color — never a false "over budget" signal.
 */
const SpendingAmount: FC<SpendingAmountProps> = ({ spend, limit, qualification }) => {
  // A *partial* spend keeps its threshold color: the figure is a floor, so a color derived from it
  // understates the risk rather than overstating it. Suppressing the color would instead hide a
  // user who is already over their limit.
  const color = spend != null ? getHardLimitSpendColor(spend, limit) : null
  // The suffix belongs to the spend half. A limit is budget policy and is never partial, so a
  // suffix trailing the whole `spend / limit` pair would misattribute the doubt to the limit.
  const qualifiedSpend = formatSpend(spend) + formatSpendQualificationSuffix(qualification ?? {})

  return (
    <span className="whitespace-nowrap text-text-primary" style={color ? { color } : undefined}>
      {qualifiedSpend} / {formatSpend(limit)}
    </span>
  )
}

export default SpendingAmount
