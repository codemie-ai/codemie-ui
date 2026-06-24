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

import { FC } from 'react'
import { generatePath, useNavigate, useParams } from 'react-router'

import { SETTINGS_AWS_AGENTCORE_RUNTIMES_LIST_PATH } from '@/constants/routes'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'

import AwsAgentCoreRuntimeDetails from './components/AwsAgentCoreRuntimeDetails'

const AwsAgentCoreRuntimeDetailPage: FC = () => {
  const navigate = useNavigate()
  const { settingId, runtimeId } = useParams<{ settingId: string; runtimeId: string }>()

  return (
    <SettingsLayout
      content={<AwsAgentCoreRuntimeDetails settingId={settingId!} entityId={runtimeId!} />}
      contentTitle="Runtime Details"
      onBack={() =>
        navigate(
          generatePath(SETTINGS_AWS_AGENTCORE_RUNTIMES_LIST_PATH, { settingId: settingId! }),
          { replace: true }
        )
      }
    />
  )
}

export default AwsAgentCoreRuntimeDetailPage
