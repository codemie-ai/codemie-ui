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

/** Columns that support server-side sorting via the entries API. */
export const SORTABLE_COLUMNS = [
  'rank',
  'total_score',
  'user_name',
  'tier_name',
  'd1_score',
  'd2_score',
  'd3_score',
  'd4_score',
  'd5_score',
  'd6_score',
]

/** Desired column order for the leaderboard entries table (intent right after tier). */
export const LEADERBOARD_COLUMN_ORDER = [
  'rank',
  'user_name',
  'total_score',
  'tier_name',
  'usage_intent',
  'd1_score',
  'd2_score',
  'd3_score',
  'd4_score',
  'd5_score',
  'd6_score',
]

/** Shorten dimension column headers so the table stays compact. */
export const COLUMN_LABELS: Record<string, string> = {
  d1_score: 'D1',
  d2_score: 'D2',
  d3_score: 'D3',
  d4_score: 'D4',
  d5_score: 'D5',
  d6_score: 'D6',
}

/** Fixed table layout so columns don't jump when data changes. */
export const LEADERBOARD_TABLE_STYLES = {
  className: 'leaderboard-table',
  minWidth: '1200px',
  cellPadding: '6px',
  columnWidths: {
    rank: '52px',
    user_name: '14%',
    total_score: '68px',
    tier_name: '82px',
    usage_intent: '110px',
    d1_score: '56px',
    d2_score: '56px',
    d3_score: '56px',
    d4_score: '56px',
    d5_score: '56px',
    d6_score: '56px',
    total_spend: '80px',
  },
}

export const SORT_KEY_TO_API: Record<string, string> = { tier_name: 'tier_level' }

export const SORT_API_TO_KEY: Record<string, string> = { tier_level: 'tier_name' }
