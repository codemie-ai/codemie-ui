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

interface DetailsItemProps {
  icon: ReactNode
  title: string
  description: string
}

const DetailsItem = ({ icon, title, description }: DetailsItemProps) => {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 flex justify-center items-center size-8 min-w-8 rounded-lg border border-border-specific-panel-outline">
        {icon}
      </div>
      <div className="flex text-xs flex-col gap-1">
        <p>{title}</p>
        <p className="text-text-quaternary">{description}</p>
      </div>
    </div>
  )
}

export default DetailsItem
