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

/**
 * Hides the kata slice of the leaderboard when katas are off. Display only: server totals and
 * scores are never recomputed. The keys come from backend `_score_d6`; exact match, no substring.
 */
export const KATA_METRIC_KEY = 'kata_completed'
export const KATA_COMPONENT_KEY = 'learning'

export const filterSummaryMetrics = <T>(
  enabled: boolean,
  metrics: Record<string, T>
): Record<string, T> => {
  if (enabled) return metrics
  const { [KATA_METRIC_KEY]: _omit, ...rest } = metrics
  return rest
}

export const filterComponentsArray = <T extends { key: string }>(
  enabled: boolean,
  components: T[]
): T[] => (enabled ? components : components.filter((c) => c.key !== KATA_COMPONENT_KEY))

export const filterComponentsObject = <T>(
  enabled: boolean,
  components: Record<string, T>
): Record<string, T> => {
  if (enabled) return components
  const { [KATA_COMPONENT_KEY]: _omit, ...rest } = components
  return rest
}
