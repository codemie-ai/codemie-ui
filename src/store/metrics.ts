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

import { proxy } from 'valtio'

import { MetricEvent } from '@/constants/metrics'
import api from '@/utils/api'

interface MetricsStoreType {
  trackMetric: (eventType: MetricEvent, metadata?: Record<string, any>) => Promise<void>
}

export const metricsStore = proxy<MetricsStoreType>({
  async trackMetric(eventType: MetricEvent, metadata?: Record<string, any>) {
    try {
      const payload = {
        name: eventType,
        attributes: {
          timestamp: new Date().toISOString(),
          ...metadata,
        },
      }

      await api.post('v1/metrics', payload)
    } catch (error) {
      // Silently fail - we don't want to disrupt user experience if metrics fail
      console.error('Error tracking metric:', error)
    }
  },
})
