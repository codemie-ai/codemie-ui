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

import InfoBox from '@/components/form/InfoBox'
import { Setting } from '@/types/entity/setting'

interface HintProps {
  setting?: Setting
}

const DeleteWarning: React.FC<HintProps> = ({ setting }) => {
  if (!setting) return null

  return (
    <>
      {setting?.credential_type === 'AWS' && (
        <InfoBox
          className="w-[380px] mt-4"
          text={
            <span className="text-aborted-primary">
              You are about to delete an AWS integration. All entities (assistants, workflows, data
              sources and guardrails) installed using this integration will be permanently deleted.
            </span>
          }
          iconClassName="stroke-aborted-primary fill-aborted-primary"
        />
      )}
    </>
  )
}

export default DeleteWarning
