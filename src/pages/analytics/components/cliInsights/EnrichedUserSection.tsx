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

import { FC, useMemo, useState } from 'react'

import SelectButton, { type SelectButtonOption } from '@/components/SelectButton/SelectButton'
import { TabularMetricType, type AnalyticsQueryParams } from '@/types/analytics'

import BarChartWidget from '../widgets/BarChartWidget'
import DonutChartWidget from '../widgets/DonutChartWidget'

const ChartMode = { COUNT: 'count', COST: 'cost' } as const
type ChartMode = (typeof ChartMode)[keyof typeof ChartMode]

const TopNFilter = { TEN: 10, TWENTY: 20, ALL: 'all' } as const
type TopN = (typeof TopNFilter)[keyof typeof TopNFilter]

const EnrichedScope = {
  COUNTRY: 'country',
  JOB_TITLE: 'job_title',
  PRIMARY_SKILL: 'primary_skill',
  CITY: 'city',
} as const

const EnrichedField = {
  USER_COUNT: 'user_count',
  TOTAL_COST: 'total_cost',
} as const

interface EnrichedUserSectionProps {
  filters: AnalyticsQueryParams
}

const MODE_OPTIONS: SelectButtonOption[] = [
  { label: 'Count', value: ChartMode.COUNT },
  { label: 'Cost', value: ChartMode.COST },
]

const TOP_N_OPTIONS: SelectButtonOption[] = [
  { label: 'Top 10', value: String(TopNFilter.TEN) },
  { label: 'Top 20', value: String(TopNFilter.TWENTY) },
  { label: 'All', value: TopNFilter.ALL },
]

const toTopN = (v: string): TopN =>
  v === TopNFilter.ALL
    ? TopNFilter.ALL
    : (Number(v) as typeof TopNFilter.TEN | typeof TopNFilter.TWENTY)

const EnrichedUserSection: FC<EnrichedUserSectionProps> = ({ filters }) => {
  const [jobTitleMode, setJobTitleMode] = useState<ChartMode>(ChartMode.COUNT)
  const [levelMode, setLevelMode] = useState<ChartMode>(ChartMode.COUNT)
  const [countryTopN, setCountryTopN] = useState<TopN>(TopNFilter.TEN)
  const [cityTopN, setCityTopN] = useState<TopN>(TopNFilter.TEN)

  const countryBarExtraParams = useMemo(
    () => ({ per_page: countryTopN === TopNFilter.ALL ? 100 : (countryTopN as number) }),
    [countryTopN]
  )

  const cityBarExtraParams = useMemo(
    () => ({ per_page: cityTopN === TopNFilter.ALL ? 100 : (cityTopN as number) }),
    [cityTopN]
  )

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-text-primary">User Enrichment</h2>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <BarChartWidget
          metricType={TabularMetricType.CLI_INSIGHTS_BY_ENRICHED_USER_COUNTRY}
          title="Top Countries by Cost"
          description="Highest-cost countries in the selected period."
          labelField={EnrichedScope.COUNTRY}
          valueField={EnrichedField.TOTAL_COST}
          yAxisLabel={EnrichedField.TOTAL_COST}
          horizontal
          filters={filters}
          extraParams={countryBarExtraParams}
          actions={
            <SelectButton
              value={String(countryTopN)}
              options={TOP_N_OPTIONS}
              onChange={(v) => setCountryTopN(toTopN(v))}
            />
          }
        />

        <BarChartWidget
          metricType={TabularMetricType.CLI_INSIGHTS_BY_ENRICHED_USER_CITY}
          title="Top Cities by Cost"
          description="Highest-cost cities in the selected period."
          labelField={EnrichedScope.CITY}
          valueField={EnrichedField.TOTAL_COST}
          yAxisLabel={EnrichedField.TOTAL_COST}
          horizontal
          filters={filters}
          extraParams={cityBarExtraParams}
          actions={
            <SelectButton
              value={String(cityTopN)}
              options={TOP_N_OPTIONS}
              onChange={(v) => setCityTopN(toTopN(v))}
            />
          }
        />

        <DonutChartWidget
          metricType={TabularMetricType.CLI_INSIGHTS_BY_ENRICHED_USER_JOB_TITLE}
          title="Users by Job Title"
          description="CLI users distributed by job title."
          labelField={EnrichedScope.JOB_TITLE}
          valueField={
            jobTitleMode === ChartMode.COUNT ? EnrichedField.USER_COUNT : EnrichedField.TOTAL_COST
          }
          filters={filters}
          actions={
            <SelectButton
              value={jobTitleMode}
              options={MODE_OPTIONS}
              onChange={(v) => setJobTitleMode(v as ChartMode)}
            />
          }
        />

        <DonutChartWidget
          metricType={TabularMetricType.CLI_INSIGHTS_BY_ENRICHED_USER_PRIMARY_SKILL}
          title="Users by Primary Skill"
          description="CLI users distributed by primary skill."
          labelField={EnrichedScope.PRIMARY_SKILL}
          valueField={
            levelMode === ChartMode.COUNT ? EnrichedField.USER_COUNT : EnrichedField.TOTAL_COST
          }
          filters={filters}
          actions={
            <SelectButton
              value={levelMode}
              options={MODE_OPTIONS}
              onChange={(v) => setLevelMode(v as ChartMode)}
            />
          }
        />
      </div>
    </section>
  )
}

export default EnrichedUserSection
