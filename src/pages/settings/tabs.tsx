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

import AwsSvg from '@/assets/icons/aws.svg?react'
import AdminTabSvg from '@/assets/icons/lightning.svg?react'
import ProfileTabSvg from '@/assets/icons/profile-tab.svg?react'
import { LayoutTab } from '@/components/Layouts/Layout/Layout'
import { SettingsTab } from '@/constants'
import { isEnterpriseEdition } from '@/utils/enterpriseEdition'
import { isMcpEnabled } from '@/utils/featureFlags'

export const getNavigationTabs = (isAdmin: boolean, awsSupported = false): LayoutTab[] => {
  const isMcpFeatureEnabled = isMcpEnabled()
  const isEnterprise = isEnterpriseEdition()

  // Build administration children and sort alphabetically
  const administrationChildren = isAdmin
    ? [
        ...(isEnterprise
          ? [
              {
                id: SettingsTab.AI_ADOPTION_CONFIG,
                name: 'AI/Run Adoption Framework',
                title: 'AI/Run Adoption Framework',
                url: '/settings/administration/ai-adoption-config',
              },
            ]
          : []),
        {
          id: SettingsTab.CATEGORIES_MANAGEMENT,
          name: 'Categories management',
          title: 'Categories management',
          url: '/settings/administration/categories',
        },
        ...(isMcpFeatureEnabled
          ? [
              {
                id: SettingsTab.MCP_MANAGEMENT,
                name: 'MCPs management',
                title: 'MCPs catalog management',
                url: '/settings/administration/mcps',
              },
            ]
          : []),
        {
          id: SettingsTab.PROJECTS_MANAGEMENT,
          name: 'Projects management',
          title: 'Projects management',
          url: '/settings/administration/projects',
        },
        {
          id: SettingsTab.PROVIDERS_MANAGEMENT,
          name: 'Providers management',
          title: 'Providers management',
          url: '/settings/administration/providers',
        },
      ].sort((a, b) => a.name.localeCompare(b.name))
    : []

  const administrationTab: LayoutTab = {
    id: SettingsTab.ADMINISTRATION,
    name: 'Administration',
    title: 'Administration',
    url: '/settings/administration',
    icon: <AdminTabSvg />,
    children: administrationChildren,
  }

  // Build AWS children and sort alphabetically
  const awsChildren = [
    {
      id: SettingsTab.AWS_ASSISTANTS,
      name: 'Agents',
      title: 'AWS Integration',
      url: '/settings/aws/assistants',
    },
    {
      id: SettingsTab.AWS_WORKFLOWS,
      name: 'Flows',
      title: 'AWS Integration',
      url: '/settings/aws/workflows',
    },
    {
      id: SettingsTab.AWS_DATA_SOURCES,
      name: 'Knowledge Bases',
      title: 'AWS Integration',
      url: '/settings/aws/data-sources',
    },
    {
      id: SettingsTab.AWS_GUARDRAILS,
      name: 'Guardrails',
      title: 'AWS Integration',
      url: '/settings/aws/guardrails',
    },
  ].sort((a, b) => a.name.localeCompare(b.name))

  return [
    {
      id: SettingsTab.PROFILE,
      name: 'Profile',
      title: 'Profile',
      url: '/settings/profile',
      icon: <ProfileTabSvg />,
    },
    ...(administrationTab.children?.length ? [administrationTab] : []),
    ...(awsSupported
      ? [
          {
            id: 'aws',
            name: 'AWS Integration',
            title: '',
            section: 'External Vendors',
            url: '/settings/aws',
            icon: <AwsSvg />,
            children: awsChildren,
          },
        ]
      : []),
  ]
}
