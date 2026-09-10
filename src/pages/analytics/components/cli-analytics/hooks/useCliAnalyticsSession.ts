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

import { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { cliAnalyticsStore } from '@/store/cliAnalytics'
import type { SessionDetail } from '@/types/cliAnalytics'

export interface UseCliAnalyticsSessionResult {
  session: SessionDetail | null
  loading: boolean
  error: string | null
}

export function useCliAnalyticsSession(traceId: string | null): UseCliAnalyticsSessionResult {
  const snap = useSnapshot(cliAnalyticsStore)

  useEffect(() => {
    if (!traceId) return
    cliAnalyticsStore.fetchSessionDetail(traceId)
  }, [traceId])

  const key = traceId ? `session:${traceId}` : null

  return {
    session: traceId ? (snap.sessionDetail[traceId] as SessionDetail | undefined) ?? null : null,
    loading: key ? snap.loading[key] ?? false : false,
    error: key ? snap.error[key]?.message ?? null : null,
  }
}
