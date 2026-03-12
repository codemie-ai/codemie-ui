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

import AwsWorkflowDetails from './AwsWorkflowDetails'
import SettingsLayout from '../../components/SettingsLayout'
import AwsEntityList from '../../components/vendor/AwsEntityList'

const AwsWorkflowsPage: FC = () => {
  const router = useVueRouter()
  const settingId = router.currentRoute.value.params?.settingId as string
  const workflowId = router.currentRoute.value.params?.flowId as string

  const renderContent = () => {
    if (workflowId && settingId) {
      return <AwsWorkflowDetails settingId={settingId} entityId={workflowId} />
    }

    if (settingId) {
      return (
        <AwsEntityList
          originType={VendorOriginType.AWS}
          entityType={VendorEntityType.workflows}
          settingId={settingId}
        />
      )
    }

    return (
      <AwsEntitySettingsTable
        entityType={VendorEntityType.workflows}
        originType={VendorOriginType.AWS}
      />
    )
  }

  const goBack = () => {
    if (workflowId) {
      router.replace({ name: 'aws-workflow-settings-detail', params: { settingId } })
    } else {
      router.replace({ name: 'aws-workflow-settings' })
    }
  }

  let title = settingId ? 'AWS Flows' : 'AWS Flows Manage'
  if (workflowId) {
    title = 'Flow Details'
  }

  return (
    <SettingsLayout
      content={renderContent()}
      contentTitle={title}
      onBack={settingId ? goBack : undefined}
    />
  )
}

export default AwsWorkflowsPage
