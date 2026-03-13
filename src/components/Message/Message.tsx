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

import InfoSvg from '@/assets/icons/info.svg?react'

export interface InfoMessageProps {
  children?: React.ReactNode
}

const InfoMessage: React.FC<InfoMessageProps> = ({ children }) => {
  return (
    <div className="flex w-full gap-2">
      <div className="opacity-75 -mt-[1px]">
        <InfoSvg />
      </div>

      <div className="text-text-quaternary text-xs flex-1">{children}</div>
    </div>
  )
}

export default InfoMessage
