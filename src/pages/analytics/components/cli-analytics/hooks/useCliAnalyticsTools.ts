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

import type { AnalyticsQueryParams } from '@/types/analytics'
import type {
  CliAnalyticsToolsData,
  InvocationRow,
  TokensByModelRow,
  ToolWithSuccessRow,
} from '@/types/cliAnalytics'

import { useCliAnalyticsSlice } from './useCliAnalyticsSlice'

export interface UseCliAnalyticsToolsResult {
  toolUsage: ToolWithSuccessRow[]
  tokensByModel: TokensByModelRow[]
  skillsInvoked: InvocationRow[]
  agentSubtypes: InvocationRow[]
  slashCommands: InvocationRow[]
  loading: boolean
  error: string | null
}

export function useCliAnalyticsTools(
  filters: AnalyticsQueryParams,
  repositories?: string[]
): UseCliAnalyticsToolsResult {
  const { data, loading, error } = useCliAnalyticsSlice<CliAnalyticsToolsData>(
    'tools',
    filters,
    repositories
  )
  return {
    toolUsage: data?.tool_usage ?? [],
    tokensByModel: data?.tokens_by_model ?? [],
    skillsInvoked: data?.skills_invoked ?? [],
    agentSubtypes: data?.agent_subtypes ?? [],
    slashCommands: data?.slash_commands ?? [],
    loading,
    error,
  }
}
