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

import AwsGuardrailDetails from './AwsGuardrailDetails'
import SettingsLayout from '../../components/SettingsLayout'
import AwsEntityList from '../../components/vendor/AwsEntityList'

const AwsGuardrailsPage: FC = () => {
  const router = useVueRouter()
  const settingId = router.currentRoute.value.params?.settingId as string
  const guardrailId = router.currentRoute.value.params?.guardrailId as string

  const renderContent = () => {
    if (guardrailId && settingId) {
      return <AwsGuardrailDetails settingId={settingId} entityId={guardrailId} />
    }

    if (settingId) {
      return (
        <AwsEntityList
          originType={VendorOriginType.AWS}
          entityType={VendorEntityType.guardrails}
          settingId={settingId}
        />
      )
    }

    return (
      <AwsEntitySettingsTable
        entityType={VendorEntityType.guardrails}
        originType={VendorOriginType.AWS}
      />
    )
  }

  const goBack = () => {
    if (guardrailId) {
      router.replace({ name: 'aws-guardrail-settings-detail', params: { settingId } })
    } else {
      router.replace({ name: 'aws-guardrail-settings' })
    }
  }

  let title = settingId ? 'AWS Guardrails' : 'AWS Guardrails Manage'
  if (guardrailId) {
    title = 'Guardrail Details'
  }

  return (
    <SettingsLayout
      content={renderContent()}
      contentTitle={title}
      onBack={settingId ? goBack : undefined}
    />
  )
}

export default AwsGuardrailsPage
