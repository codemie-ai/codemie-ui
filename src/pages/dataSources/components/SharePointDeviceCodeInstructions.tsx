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

import { FC } from 'react'

import { DeviceCodeState } from '@/types/entity/dataSource'

interface Props {
  deviceCode: DeviceCodeState
}

const SharePointDeviceCodeInstructions: FC<Props> = ({ deviceCode }) => (
  <div className="flex flex-col gap-1.5">
    <p className="text-text-secondary">{deviceCode.message}</p>
    <p>
      1. Open{' '}
      <a
        href={deviceCode.verificationUri}
        target="_blank"
        rel="noreferrer"
        className="text-text-link underline"
      >
        {deviceCode.verificationUri}
      </a>
    </p>
    <p>
      2. Enter the code:{' '}
      <span className="font-mono font-bold tracking-widest text-base">{deviceCode.userCode}</span>
    </p>
    <p className="text-text-tertiary">Waiting for authentication…</p>
  </div>
)

export default SharePointDeviceCodeInstructions
