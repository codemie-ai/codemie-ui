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

import { ReactNode } from 'react'

import { cn } from '@/utils/utils'

interface DetailsBadgeProps {
  value: string | number | boolean
  icon?: ReactNode
  filled?: boolean
  className?: string
}

const DetailsBadge = ({ value, icon, filled = false, className }: DetailsBadgeProps) => {
  return (
    <div
      className={cn(
        'py-1.5 px-2 flex items-center gap-2 rounded-lg border border-border-specific-panel-outline font-semibold bg-surface-base-secondary',
        filled && 'bg-surface-base-secondary-tertiary',
        className
      )}
    >
      {icon} {String(value)}
    </div>
  )
}

export default DetailsBadge
