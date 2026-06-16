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

import { type FC, type ComponentType, type SVGProps } from 'react'
import { Link } from 'react-router'

interface ResourceCounterBadgeProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  count: number | undefined
  tooltip: string
  to: string
}

const ResourceCounterBadge: FC<ResourceCounterBadgeProps> = ({
  icon: Icon,
  count,
  tooltip,
  to,
}) => (
  <Link
    to={to}
    className="flex items-center border rounded-md px-2 py-1 border-border-structural w-[68px] cursor-pointer hover:opacity-70 transition-opacity"
    data-tooltip-id="react-tooltip"
    data-tooltip-content={tooltip}
    aria-label={tooltip}
  >
    <Icon className="w-5 h-5" />
    <span className="ml-2">{count ?? 0}</span>
  </Link>
)

export default ResourceCounterBadge
