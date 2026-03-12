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

import { FC, useEffect, useMemo, useState } from 'react'

import Select from '@/components/form/Select'
import Popup from '@/components/Popup'
import type { AnalyticsWidgetItem } from '@/types/analytics'
import { TimePeriod } from '@/types/analytics'

import { TIME_PERIOD_OPTIONS } from '../constants'
import DynamicWidget from './widgets/DynamicWidget'

interface WidgetPreviewModalProps {
  visible: boolean
  onHide: () => void
  widget: AnalyticsWidgetItem | null
}

const WidgetPreviewModal: FC<WidgetPreviewModalProps> = ({ visible, onHide, widget }) => {
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>(TimePeriod.LAST_HOUR)

  useEffect(() => {
    if (visible) setSelectedTimePeriod(TimePeriod.LAST_HOUR)
  }, [visible])

  const previewFilters = useMemo(() => ({ time_period: selectedTimePeriod }), [selectedTimePeriod])

  const headerContent = useMemo(
    () => (
      <div className="flex items-center justify-between gap-4 w-full">
        <span className="font-semibold">Widget Preview</span>
        <div className="w-48">
          <Select
            value={selectedTimePeriod}
            options={TIME_PERIOD_OPTIONS}
            onChange={(e) => setSelectedTimePeriod(e.value)}
            placeholder="Select time period"
          />
        </div>
      </div>
    ),
    [selectedTimePeriod]
  )

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      hideFooter
      className="w-full max-w-5xl pb-4"
      bodyClassName="show-scroll !pt-0"
      withBorder={false}
      headerContent={headerContent}
    >
      {widget && <DynamicWidget expandable={false} filters={previewFilters} widget={widget} />}
    </Popup>
  )
}

export default WidgetPreviewModal
