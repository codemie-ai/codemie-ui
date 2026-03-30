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

import { getTailwindColor } from '@/utils/tailwindColors'

export const calculatePercentage = (current: number, limit: number): number => {
  if (Number.isNaN(current) || Number.isNaN(limit) || limit === 0) return 0
  return Math.min((current / limit) * 100, 100)
}

export const getStatusColor = (
  percentage: number,
  dangerThreshold: number,
  warningThreshold: number
): string => {
  if (percentage > dangerThreshold) {
    return getTailwindColor('--colors-surface-specific-charts-red')
  }
  if (percentage > warningThreshold) {
    return getTailwindColor('--colors-surface-specific-charts-yellow')
  }
  return getTailwindColor('--colors-surface-specific-charts-green')
}

export const getStatusColorWithOpacity = (
  percentage: number,
  dangerThreshold: number,
  warningThreshold: number
): string => {
  if (percentage > dangerThreshold) {
    return getTailwindColor('--colors-surface-specific-charts-red', undefined, 0.2)
  }
  if (percentage > warningThreshold) {
    return getTailwindColor('--colors-surface-specific-charts-yellow', undefined, 0.2)
  }
  return getTailwindColor('--colors-surface-specific-charts-green', undefined, 0.2)
}
