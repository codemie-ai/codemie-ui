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
  Filler,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js'
import { FC, useMemo } from 'react'
import { Radar } from 'react-chartjs-2'

import type { LeaderboardDimension } from '@/types/analytics'
import { getTailwindColor } from '@/utils/tailwindColors'

import { DIMENSION_COLORS } from './constants'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

interface UserDimensionRadarProps {
  dimensions: LeaderboardDimension[]
}

const UserDimensionRadar: FC<UserDimensionRadarProps> = ({ dimensions }) => {
  const radarBorderColor = getTailwindColor(
    '--colors-surface-specific-charts-blue',
    DIMENSION_COLORS.d1
  )
  const radarFillColor = getTailwindColor(
    '--colors-surface-specific-charts-blue',
    DIMENSION_COLORS.d1,
    0.15
  )

  const radarData = useMemo(
    () => ({
      labels: dimensions.map(
        (dimension) => `${dimension.label} (${((dimension.score ?? 0) * 100).toFixed(0)})`
      ),
      datasets: [
        {
          data: dimensions.map((dimension) => (dimension.score ?? 0) * 100),
          borderColor: radarBorderColor,
          backgroundColor: radarFillColor,
          pointBackgroundColor: dimensions.map(
            (dimension) => dimension.color ?? DIMENSION_COLORS[dimension.id] ?? '#6b7280'
          ),
          pointBorderColor: 'transparent',
          pointRadius: 5,
          borderWidth: 2,
        },
      ],
    }),
    [dimensions, radarBorderColor, radarFillColor]
  )

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        angleLines: { color: getTailwindColor('--colors-border-structural', '#2a2a4a') },
        grid: { color: getTailwindColor('--colors-border-structural', '#2a2a4a') },
        pointLabels: {
          color: getTailwindColor('--colors-text-primary', '#e2e8f0'),
          font: { size: 11 },
        },
        ticks: {
          color: getTailwindColor('--colors-text-quaternary', '#94a3b8'),
          backdropColor: 'transparent',
        },
      },
    },
    plugins: {
      legend: { display: false },
      datalabels: { display: false },
    },
  } as const

  return (
    <div className="mx-auto w-full max-w-md">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-quaternary">
        Dimension Scores
      </h4>
      <Radar data={radarData} options={radarOptions} />
    </div>
  )
}

export default UserDimensionRadar
