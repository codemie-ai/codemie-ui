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

import React from 'react'

interface InfoCardProps {
  heading: string
  description?: string
  icon?: React.ElementType | React.ReactNode
  children?: React.ReactNode
  'data-onboarding'?: string
}

const InfoCard: React.FC<InfoCardProps> = ({ heading, description, icon, children, ...rest }) => {
  return (
    <div
      className="bg-surface-base-chat rounded-lg p-4 border border-border-specific-panel-outline"
      {...rest}
    >
      <div className="grid grid-cols-[auto,1fr] gap-x-4">
        <div className="w-8 h-8 min-w-8 bg-surface-specific-dropdown-hover text-text-primary rounded-full flex justify-center items-center">
          {typeof icon === 'function' ? React.createElement(icon) : icon || null}
        </div>
        <h2 className="font-medium place-content-center">{heading}</h2>

        <div className="flex flex-col col-start-2">
          {description && <p className="text-text-quaternary text-xs mt-2">{description}</p>}
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  )
}

export default InfoCard
