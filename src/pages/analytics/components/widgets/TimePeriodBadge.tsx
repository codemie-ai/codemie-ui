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

import { FC } from 'react'

interface TimePeriodBadgeProps {
  label: string
  tooltip?: string
}

const TimePeriodBadge: FC<TimePeriodBadgeProps> = ({ label, tooltip }) => {
  return (
    <span
      data-tooltip-id={tooltip ? 'react-tooltip' : undefined}
      data-tooltip-content={tooltip}
      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-surface-base-secondary border border-border-secondary whitespace-nowrap"
    >
      <svg
        className="w-3 h-3 shrink-0"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  )
}

export default TimePeriodBadge
