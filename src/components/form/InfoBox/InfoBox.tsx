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

import React, { ReactNode } from 'react'

import InfoIcon from '@/assets/icons/info.svg?react'

interface InfoBoxProps {
  text?: ReactNode
  children?: ReactNode
  className?: string
  iconClassName?: string
}

const InfoBox: React.FC<InfoBoxProps> = ({
  children,
  text,
  className = '',
  iconClassName = '',
}) => {
  return (
    <div className={`flex text-text-quaternary text-xs ${className}`}>
      <InfoIcon className={`w-[18px] h-[18px] mr-2 flex-shrink-0 opacity-75 ${iconClassName}`} />
      <span className="mt-0.5">{children || text}</span>
    </div>
  )
}

export default InfoBox
