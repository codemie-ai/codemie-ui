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

/**
 * Top N filter utilities for analytics widgets
 * Provides types, constants, and helpers for Top 10/Top 20/All filtering
 */

export const TopNFilter = { TEN: 10, TWENTY: 20, ALL: 'all' } as const
export type TopN = (typeof TopNFilter)[keyof typeof TopNFilter]

export const TOP_N_OPTIONS = [
  { label: 'Top 10', value: String(TopNFilter.TEN) },
  { label: 'Top 20', value: String(TopNFilter.TWENTY) },
  { label: 'All', value: TopNFilter.ALL },
]

export const API_MAX_PER_PAGE = 100

/**
 * Convert Select component string value to TopN type
 */
export const toTopN = (v: string): TopN => {
  if (v === TopNFilter.ALL) return TopNFilter.ALL
  const num = Number(v)
  if (num === TopNFilter.TEN || num === TopNFilter.TWENTY) return num
  return TopNFilter.TEN // fallback for invalid input
}

/**
 * Convert TopN value to API per_page parameter
 * "All" maps to API_MAX_PER_PAGE (API maximum)
 */
export const toPerPage = (topN: TopN): number =>
  topN === TopNFilter.ALL ? API_MAX_PER_PAGE : (topN as number)
