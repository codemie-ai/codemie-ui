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
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { FC, useMemo } from 'react'
import { Bar, Doughnut, Pie } from 'react-chartjs-2'

import { useTheme } from '@/hooks/useTheme'
import type { UaModelRow, UaPayer, UaWhoPays } from '@/types/usageAttribution'
import { generateChartColors } from '@/utils/chartColors'
import { getTailwindColor } from '@/utils/tailwindColors'

import { Swatch } from './Badges'
import { UA_PAYER_LABELS } from '../constants'
import { formatMoney, formatMoneyShort, formatPct, useUaColors } from '../utils'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ChartDataLabels
)

const useChartTheme = () => {
  const { theme, appearance } = useTheme()
  return useMemo(
    () => ({
      tooltip: {
        backgroundColor: getTailwindColor(
          '--colors-surface-specific-charts-tooltip-background',
          '#1F2937'
        ),
        titleColor: getTailwindColor('--colors-text-specific-charts-tooltip-title', '#F9FAFB'),
        bodyColor: getTailwindColor('--colors-surface-specific-charts-tooltip-body', '#E5E7EB'),
        padding: 12,
      },
      grid: getTailwindColor(
        '--colors-surface-specific-charts-bar-grid',
        'rgba(255, 255, 255, 0.1)'
      ),
      text: getTailwindColor('--colors-text-secondary', '#9CA3AF'),
      surface: getTailwindColor('--colors-surface-base-secondary', '#FFFFFF'),
    }),
    // The colours come from CSS variables that change with the theme and its appearance preset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme, appearance]
  )
}

export interface PieSlice {
  id: string
  label: string
  value: number
  color: string
  group?: string
}

/** Where the Money Goes: a pie with percentages on the slices and a legend with amounts and shares. */
export const MoneyPie: FC<{ slices: PieSlice[]; ariaLabel: string }> = ({ slices, ariaLabel }) => {
  const t = useChartTheme()
  const total = slices.reduce((s, x) => s + x.value, 0)
  const data = useMemo(
    () => ({
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.value),
          backgroundColor: slices.map((s) => s.color),
          borderColor: t.surface,
          borderWidth: 2,
        },
      ],
    }),
    [slices, t.surface]
  )
  const options: ChartOptions<'pie'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...t.tooltip,
          callbacks: {
            label: (c) =>
              ` ${c.label}: ${formatMoney(Number(c.raw))} (${formatPct(Number(c.raw), total, 1)})`,
          },
        },
        datalabels: {
          color: '#FFFFFF',
          font: { weight: 'bold' as const, size: 12 },
          formatter: (value: number) =>
            total && value / total >= 0.06 ? `${Math.round((value / total) * 100)}%` : '',
        },
      },
    }),
    [t, total]
  )
  if (!total)
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-text-quaternary">
        No spend in the period
      </div>
    )
  let lastGroup: string | undefined
  return (
    // The legend moves under the pie when the widget is too narrow for both side by side.
    <div className="flex flex-wrap gap-6 items-center justify-center">
      <span className="sr-only">{ariaLabel}</span>
      <div className="relative h-[240px] w-[240px] shrink-0">
        <Pie data={data} options={options} />
      </div>
      <div className="flex-1 min-w-[260px] flex flex-col gap-2 text-sm">
        {slices.map((s) => {
          const header = s.group && s.group !== lastGroup ? s.group : null
          lastGroup = s.group
          return (
            <div key={s.id}>
              {header && (
                <div className="mt-1 mb-1 text-[11px] font-semibold uppercase tracking-[0.03em] text-text-quaternary">
                  {header}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Swatch color={s.color} />
                <span className="flex-1 min-w-0 truncate text-text-primary">{s.label}</span>
                <span className="font-semibold text-text-primary [font-variant-numeric:tabular-nums]">
                  {formatMoney(s.value)}
                </span>
                <span className="w-14 text-right text-text-quaternary [font-variant-numeric:tabular-nums]">
                  {formatPct(s.value, total, 1)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PAYERS: UaPayer[] = ['charged', 'shared', 'personal']

/** Who Pays: Web Platform and CLI spend in three states, as horizontal stacked bars. */
export const WhoPaysBars: FC<{ web: UaWhoPays; cli: UaWhoPays }> = ({ web, cli }) => {
  const t = useChartTheme()
  const colors = useUaColors()
  const data = useMemo(
    () => ({
      labels: ['Web Platform', 'CLI'],
      datasets: PAYERS.map((p) => ({
        label: UA_PAYER_LABELS[p],
        data: [web[p], cli[p]],
        backgroundColor: colors.payer(p),
        borderColor: t.surface,
        borderWidth: { right: 2 },
        borderSkipped: false,
        borderRadius: 2,
        maxBarThickness: 40,
      })),
    }),
    [web, cli, colors, t.surface]
  )
  const options: ChartOptions<'bar'> = useMemo(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
          ...t.tooltip,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (c) => ` ${c.dataset.label}: ${formatMoney(Number(c.raw))}`,
            footer: (items) =>
              `Total: ${formatMoney(items.reduce((s, x) => s + Number(x.raw), 0))}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: t.grid },
          border: { display: false },
          ticks: { color: t.text, callback: (v) => formatMoneyShort(Number(v)) },
        },
        y: { stacked: true, grid: { display: false }, ticks: { color: t.text } },
      },
    }),
    [t]
  )
  const totals = PAYERS.map((p) => ({ payer: p, value: web[p] + cli[p] }))
  return (
    <div className="flex flex-col gap-4">
      <span className="sr-only">Who pays for Web Platform and CLI spend</span>
      <div className="h-[180px]">
        <Bar data={data} options={options} />
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {totals.map(({ payer, value }) => (
          <div key={payer} className="flex items-center gap-2">
            <Swatch color={colors.payer(payer)} />
            <span className="text-text-secondary">{UA_PAYER_LABELS[payer]}</span>
            <span className="font-semibold text-text-primary">{formatMoneyShort(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Models by spend: a donut with a legend (popups). */
export const ModelsDonut: FC<{ models: UaModelRow[] }> = ({ models }) => {
  const t = useChartTheme()
  const palette = useMemo(() => generateChartColors(models.length), [models.length])
  const total = models.reduce((s, m) => s + m.spend, 0)
  const data = useMemo(
    () => ({
      labels: models.map((m) => m.model),
      datasets: [
        {
          data: models.map((m) => m.spend),
          backgroundColor: palette,
          borderColor: t.surface,
          borderWidth: 2,
        },
      ],
    }),
    [models, palette, t.surface]
  )
  const options: ChartOptions<'doughnut'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        datalabels: { display: false },
        tooltip: {
          ...t.tooltip,
          callbacks: {
            label: (c) =>
              ` ${c.label}: ${formatMoney(Number(c.raw))} (${formatPct(Number(c.raw), total)})`,
          },
        },
      },
    }),
    [t, total]
  )
  if (!total) return <p className="text-sm text-text-quaternary">No model usage in the period.</p>
  return (
    <div className="flex items-center gap-4 max-sm:flex-col">
      <span className="sr-only">Models by spend</span>
      <div className="h-[150px] w-[150px] shrink-0">
        <Doughnut data={data} options={options} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1.5 text-xs">
        {models.map((m, i) => (
          <div key={m.model} className="flex items-center gap-2">
            <Swatch color={palette[i]} />
            <span className="flex-1 min-w-0 truncate text-text-primary" title={m.model}>
              {m.model}
            </span>
            <span className="font-semibold text-text-primary">{formatMoney(m.spend)}</span>
            <span className="w-10 text-right text-text-quaternary">
              {formatPct(m.spend, total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Horizontal bars in plain HTML: breakdowns by country and job title group. */
export const HBars: FC<{
  rows: Array<{ label: string; spend: number }>
  color: string
  otherColor: string
}> = ({ rows, color, otherColor }) => {
  const max = Math.max(...rows.map((r) => r.spend), 0)
  if (!rows.length || !max)
    return (
      <p className="text-sm text-text-quaternary py-6 text-center">
        No spend paid from personal budgets
      </p>
    )
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[minmax(0,160px)_1fr_72px] items-center gap-3 text-sm"
          title={`${r.label}: ${formatMoney(r.spend)}`}
        >
          <span className="truncate text-text-secondary">{r.label}</span>
          <div className="h-3 rounded-sm bg-surface-base-tertiary overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${(r.spend / max) * 100}%`,
                backgroundColor: r.label === 'Other' ? otherColor : color,
              }}
            />
          </div>
          <span className="text-right font-semibold text-text-primary [font-variant-numeric:tabular-nums]">
            {formatMoneyShort(r.spend)}
          </span>
        </div>
      ))}
    </div>
  )
}
