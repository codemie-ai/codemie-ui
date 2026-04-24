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

import { getStatusColor } from '@/pages/analytics/components/widgets/RatioWidget/utils'
import {
  SPENDING_DANGER_THRESHOLD,
  SPENDING_WARNING_THRESHOLD,
} from '@/pages/settings/components/SpendingTable'

export const calculateHardLimitPercentage = (
  currentSpending: number,
  hardLimit: number | null | undefined
): number => {
  if (hardLimit == null || hardLimit <= 0) {
    return 0
  }

  return (currentSpending / hardLimit) * 100
}

export const getHardLimitSpendColor = (
  currentSpending: number,
  hardLimit: number | null | undefined
): string | null => {
  if (hardLimit == null || hardLimit <= 0) {
    return null
  }

  return getStatusColor(
    calculateHardLimitPercentage(currentSpending, hardLimit),
    SPENDING_DANGER_THRESHOLD,
    SPENDING_WARNING_THRESHOLD
  )
}
