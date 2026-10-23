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

import { FC, useState } from 'react'

import Select from '@/components/form/Select'
import type { UaBreakdown, UaCategory, UaResponse } from '@/types/usageAttribution'

import AnalyticsWidget from '../../AnalyticsWidget'
import { UA_CATEGORIES, UA_CATEGORY_LABELS } from '../constants'
import { HBars } from './Charts'
import { useUaQuery } from '../hooks/useUaQuery'
import { errorText, useUaColors } from '../utils'

interface Props {
  dimension: 'country' | 'job'
  params: Record<string, string | number>
}

const TITLES = {
  country: {
    title: 'CLI Spend Paid From Personal Budgets, by Country',
    description: 'Country from the EPAM profile',
  },
  job: {
    title: 'CLI Spend Paid From Personal Budgets, by Job Title Group',
    description: 'Job title group from the EPAM profile',
  },
}

/** CLI spend paid from personal budgets for one category, by country or job title group (people profiles). */
const BreakdownWidget: FC<Props> = ({ dimension, params }) => {
  const [category, setCategory] = useState<UaCategory>('production')
  const colors = useUaColors()
  const query = useUaQuery<UaResponse<UaBreakdown>>(`breakdown-${dimension}`, 'breakdown', {
    ...params,
    dimension,
    category,
  })
  return (
    <AnalyticsWidget
      title={TITLES[dimension].title}
      description={TITLES[dimension].description}
      loading={query.loading && !query.data}
      error={query.error && !query.data ? { message: errorText(query.error) } : null}
      expandable={false}
      actions={
        <Select
          value={category}
          onChangeValue={(v) => setCategory((v as UaCategory) ?? 'production')}
          options={UA_CATEGORIES.map((c) => ({ value: c, label: UA_CATEGORY_LABELS[c] }))}
          className="min-w-[150px]"
          ariaLabel="Category"
        />
      }
    >
      <HBars
        rows={query.data?.data.rows ?? []}
        color={colors.category(category)}
        otherColor={colors.category('unclassified')}
      />
    </AnalyticsWidget>
  )
}

export default BreakdownWidget
