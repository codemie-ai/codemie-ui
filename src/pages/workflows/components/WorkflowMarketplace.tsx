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

import DiagramSvg from '@/assets/icons/diagram.svg?react'

interface WorkflowMarketplaceProps {
  uniqueUsersCount?: number
}

const WorkflowMarketplace: React.FC<WorkflowMarketplaceProps> = ({ uniqueUsersCount = 0 }) => (
  <div className="flex flex-row items-center text-xs gap-3 whitespace-nowrap">
    <DiagramSvg />
    {`${uniqueUsersCount} total ${uniqueUsersCount === 1 ? 'use' : 'uses'}`}
  </div>
)

export default WorkflowMarketplace
