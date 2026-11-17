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

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { FC, useMemo } from 'react'
import { Doughnut } from 'react-chartjs-2'

import { ABSENT_VALUE_MARKER } from '@/constants'
import {
  getStatusColor,
  getStatusColorWithOpacity,
} from '@/pages/analytics/components/widgets/RatioWidget/utils'
import { MetricValue } from '@/types/analytics'
import { getTailwindColor } from '@/utils/tailwindColors'

ChartJS.register(ArcElement, ChartTooltip, Legend, ChartDataLabels)

export const SPENDING_DANGER_THRESHOLD = 75
export const SPENDING_WARNING_THRESHOLD = 50

// The colour this app already uses for "nothing is known here" - the empty-state labels below and in
// DonutChartWidget. An unknown consumption must not borrow the green/yellow/red vocabulary that only
// a measured one has earned.
const UNKNOWN_CONSUMPTION_COLOR_PROPERTY = '--colors-text-quaternary'

interface SpendingDoughnutUsageProps {
  percentage: MetricValue
}

const SpendingDoughnutUsage: FC<SpendingDoughnutUsageProps> = ({ percentage }) => {
  // null, never 0: the backend refuses to compute a percentage when the spend figure is absent or no
  // limit is configured, and "0% consumed" would assert a fact nobody has.
  const usage = typeof percentage === 'number' ? Math.min(percentage, 100) : null

  const statusColor = useMemo(() => {
    if (usage === null) return getTailwindColor(UNKNOWN_CONSUMPTION_COLOR_PROPERTY)
    return getStatusColor(usage, SPENDING_DANGER_THRESHOLD, SPENDING_WARNING_THRESHOLD)
  }, [usage])

  const statusColorWithOpacity = useMemo(() => {
    if (usage === null) {
      return getTailwindColor(UNKNOWN_CONSUMPTION_COLOR_PROPERTY, undefined, 0.2)
    }
    return getStatusColorWithOpacity(usage, SPENDING_DANGER_THRESHOLD, SPENDING_WARNING_THRESHOLD)
  }, [usage])

  const chartData = useMemo(() => {
    // An unknown consumption draws no filled arc at all, leaving a neutral empty ring.
    const consumedPercentage = usage ?? 0
    return {
      labels: ['Value', 'Remaining'],
      datasets: [
        {
          data: [consumedPercentage, Math.max(0, 100 - consumedPercentage)],
          backgroundColor: [statusColor, statusColorWithOpacity],
          borderColor: 'transparent',
          borderWidth: 2,
        },
      ],
    }
  }, [usage, statusColor, statusColorWithOpacity])

  const chartOptions: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      cutout: '80%',
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: false,
        },
        datalabels: {
          display: false,
        },
      },
    }),
    []
  )

  return (
    <div className="flex-shrink-0 relative w-32 h-32">
      <Doughnut data={chartData} options={chartOptions} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2">
        <div className="text-base font-bold" style={{ color: statusColor }}>
          {usage === null ? ABSENT_VALUE_MARKER : `${usage.toFixed(1)}%`}
        </div>
      </div>
    </div>
  )
}

export default SpendingDoughnutUsage
