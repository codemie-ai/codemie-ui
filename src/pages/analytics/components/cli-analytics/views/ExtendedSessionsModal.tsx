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

import Popup from '@/components/Popup'
import type { ExtendedSessionsTarget } from '@/types/cliAnalytics'

import SessionsView from './SessionsView'
import AnalyticsWidget from '../../AnalyticsWidget'
import MetricCard from '../../widgets/MetricCard'

import type { FC } from 'react'

interface ExtendedSessionsModalProps {
  target: ExtendedSessionsTarget
  isVisible: boolean
  onHide: () => void
}

const ExtendedSessionsModal: FC<ExtendedSessionsModalProps> = ({ target, isVisible, onHide }) => (
  <Popup
    isFullWidth
    className="xl:max-w-[90vw]"
    header={target.title}
    visible={isVisible}
    onHide={onHide}
    hideFooter
  >
    <div className="flex flex-col gap-6 pb-6">
      <AnalyticsWidget title="Summary" expandable={false} loading={false} error={null}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {target.metrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </AnalyticsWidget>
      <SessionsView
        filters={target.sessionFilters}
        repositories={target.repositories}
        isUnattributed={target.isUnattributed}
        branch={target.branch}
      />
    </div>
  </Popup>
)

export default ExtendedSessionsModal
