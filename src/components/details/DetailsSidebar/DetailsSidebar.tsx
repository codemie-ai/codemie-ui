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

import { classNames as cn } from 'primereact/utils'
import { ReactNode } from 'react'

import DetailsGradientSvg from '@/assets/images/details-gradient.svg?react'

interface DetailsSidebarProps {
  children: ReactNode
  classNames?: string
}

const DetailsSidebar = ({ children, classNames = '' }: DetailsSidebarProps) => {
  return (
    <div
      className={cn(
        'min-w-80 max-w-80 h-fit p-4 flex flex-col gap-6 bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg relative',
        classNames
      )}
    >
      <DetailsGradientSvg className="absolute -z-10 top-[-60px] left-[-53px] pointer-events-none" />
      {children}
    </div>
  )
}

export default DetailsSidebar
