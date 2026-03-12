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

import { FC, ReactNode, useEffect } from 'react'
import { useSnapshot } from 'valtio'

import { Layout } from '@/components/Layouts/Layout'
import { userStore } from '@/store'
import { appInfoStore } from '@/store/appInfo'
import { isConfigItemEnabled } from '@/utils/settings'

import { getNavigationTabs } from '../tabs'

interface Props {
  contentTitle?: string
  content?: ReactNode
  onBack?: () => void
  rightContent?: ReactNode
}

const SettingsLayout: FC<Props> = ({ contentTitle, content, onBack, rightContent }: Props) => {
  const { user } = useSnapshot(userStore) as typeof userStore
  const { configs } = useSnapshot(appInfoStore) as typeof appInfoStore

  useEffect(() => {
    appInfoStore.fetchCustomerConfig()
  }, [])

  return (
    <Layout
      tabs={getNavigationTabs(
        user?.isAdmin || false,
        isConfigItemEnabled(configs, 'vendorIntegrationAWS')
      )}
      content={content}
      title="Settings"
      subTitle="Manage settings and preferences for your workspace"
      contentTitle={contentTitle}
      onBack={onBack}
      rightContent={rightContent}
    />
  )
}

export default SettingsLayout
