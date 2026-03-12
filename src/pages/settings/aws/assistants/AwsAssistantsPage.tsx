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

import { useVueRouter } from '@/hooks/useVueRouter'
import AwsEntitySettingsTable from '@/pages/settings/components/vendor/AwsEntitySettingsTable'
import { VendorEntityType, VendorOriginType } from '@/types/entity/vendor'

import AwsAssistantDetails from './AwsAssistantDetails'
import SettingsLayout from '../../components/SettingsLayout'
import AwsEntityList from '../../components/vendor/AwsEntityList'

const AwsAssistantsPage: FC = () => {
  const router = useVueRouter()
  const settingId = router.currentRoute.value.params?.settingId as string
  const agentId = router.currentRoute.value.params?.agentId as string

  const renderContent = () => {
    if (agentId && settingId) {
      return <AwsAssistantDetails settingId={settingId} entityId={agentId} />
    }

    if (settingId) {
      return (
        <AwsEntityList
          originType={VendorOriginType.AWS}
          entityType={VendorEntityType.assistant}
          settingId={settingId}
        />
      )
    }
    return (
      <AwsEntitySettingsTable
        entityType={VendorEntityType.assistant}
        originType={VendorOriginType.AWS}
      />
    )
  }

  const goBack = () => {
    if (agentId) {
      router.replace({ name: 'aws-assistant-settings-detail', params: { settingId } })
    } else {
      router.replace({ name: 'aws-assistant-settings' })
    }
  }

  let title = settingId ? 'AWS Agents' : 'AWS Agents Manage'
  if (agentId) {
    title = 'Agent Details'
  }

  return (
    <SettingsLayout
      content={renderContent()}
      contentTitle={title}
      onBack={settingId ? goBack : undefined}
    />
  )
}

export default AwsAssistantsPage
