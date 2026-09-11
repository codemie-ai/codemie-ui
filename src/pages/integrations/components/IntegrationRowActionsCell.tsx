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

import IconDelete from '@/assets/icons/delete.svg?react'
import IconEdit from '@/assets/icons/edit.svg?react'
import NavigationMore from '@/components/NavigationMore'
import { SettingCredentialValue } from '@/types/entity/setting'
import {
  credentialValuesToRecord,
  getTestableCredentialTypes,
  isOAuthProviderSetting,
} from '@/utils/settings'

import OAuthTestAction from './OAuthTestAction'
import TestIntegration from './TestIntegration'

/** Minimal shape the row actions need — shared by user and project integration settings. */
export interface IntegrationRowItem {
  id: string
  credential_type: string
  credential_values: SettingCredentialValue[]
}

interface IntegrationRowActionsCellProps<T extends IntegrationRowItem> {
  item: T
  /** Prefix of the alias-cell id the trigger's aria-labelledby references (e.g. "user-setting-name"). */
  contextIdPrefix: string
  onEdit: (item: T) => void
  onDelete: (item: T) => void
}

/**
 * The 3-dot actions menu for one integration row (Edit / Delete + a Test action). Shared by the user
 * and project integration tables so the OAuth-vs-generic test wiring lives in one place.
 *
 * A folded OAuth integration is tested via the OAuth connect-with-test popup (same as the
 * create/edit pages), using the stored credentials — not the generic backend healthcheck.
 * OAuthTestAction (inline) stops the click from bubbling to NavigationMore's close-on-click-inside
 * handler, so the menu — and the button that owns the OAuth popup / callback listener / toast — stay
 * mounted until the flow completes. It returns null for non-OAuth types.
 */
function IntegrationRowActionsCell<T extends IntegrationRowItem>({
  item,
  contextIdPrefix,
  onEdit,
  onDelete,
}: Readonly<IntegrationRowActionsCellProps<T>>) {
  return (
    <NavigationMore
      childrenFirst
      hideOnClickInside
      contextId={`${contextIdPrefix}-${item.id}`}
      items={[
        { title: 'Edit', onClick: () => onEdit(item), icon: <IconEdit /> },
        { title: 'Delete', onClick: () => onDelete(item), icon: <IconDelete /> },
      ]}
    >
      {isOAuthProviderSetting(item) ? (
        <OAuthTestAction
          label="Test"
          inline
          testIcon="connection"
          credentialType={item.credential_type}
          settingId={item.id}
          credentialValues={credentialValuesToRecord(item.credential_values)}
        />
      ) : (
        getTestableCredentialTypes().includes(item.credential_type.toLocaleLowerCase()) && (
          <TestIntegration
            label="Test"
            inline
            credentialType={item.credential_type}
            settingId={item.id}
            credentialValues={item.credential_values}
            testIcon="connection"
          />
        )
      )}
    </NavigationMore>
  )
}

export default IntegrationRowActionsCell
