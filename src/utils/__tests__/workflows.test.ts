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

import { describe, it, expect } from 'vitest'

import { ToolkitType } from '@/constants/assistants'
import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { AssistantTool } from '@/types/workflowEditor'

import { getToolkitsFromConfiguration } from '../workflows'

describe('getToolkitsFromConfiguration', () => {
  // Mock toolkit names (using string literals since TOOLKITS doesn't have all integration names)
  const GITHUB_TOOLKIT = 'GitHub' as ToolkitType
  const SLACK_TOOLKIT = 'Slack' as ToolkitType
  const JIRA_TOOLKIT = 'Jira' as ToolkitType

  // Mock data helpers
  const createMockSetting = (alias: string, credentialType = 'oauth2'): Setting => ({
    user_id: 'user-123',
    id: `setting-${alias}`,
    date: '2024-01-01',
    alias,
    credential_type: credentialType,
    update_date: '2024-01-01',
    project_name: 'test-project',
    default: false,
    credential_values: [{ key: 'api_key', value: 'test-key' }],
    setting_hash: 'hash-123',
    is_global: false,
    setting_type: 'user',
  })

  const createMockTool = (name: string, label = name) =>
    ({
      name,
      label,
      settings: null,
      settings_config: false,
      user_description: null,
    } as Tool)

  const createMockToolkit = (
    toolkit: ToolkitType,
    tools: Tool[],
    label = toolkit
  ): AssistantToolkit => ({
    toolkit,
    tools,
    label,
    settings_config: false,
    settings: null,
    is_external: false,
  })

  it('should return empty array when no tools are provided', () => {
    const result = getToolkitsFromConfiguration([], [], {})
    expect(result).toEqual([])
  })

  it('should assign tools to Plugin toolkit when no available toolkits match', () => {
    const tools: AssistantTool[] = [{ name: 'nonexistent_tool' }]
    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(GITHUB_TOOLKIT, [createMockTool('github_create_issue')]),
    ]

    const result = getToolkitsFromConfiguration(tools, availableToolkits, {})
    expect(result).toHaveLength(1)
    expect(result[0].toolkit).toBe('Plugin')
    expect(result[0].tools).toHaveLength(1)
    expect(result[0].tools[0].name).toBe('nonexistent_tool')
  })

  it('should map tools to their correct toolkits', () => {
    const tools: AssistantTool[] = [{ name: 'github_create_issue' }, { name: 'slack_send_message' }]

    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(
        GITHUB_TOOLKIT,
        [
          createMockTool('github_create_issue', 'Create Issue'),
          createMockTool('github_list_repos', 'List Repos'),
        ],
        'GitHub' as ToolkitType
      ),
      createMockToolkit(
        SLACK_TOOLKIT,
        [
          createMockTool('slack_send_message', 'Send Message'),
          createMockTool('slack_list_channels', 'List Channels'),
        ],
        'Slack' as ToolkitType
      ),
    ]

    const result = getToolkitsFromConfiguration(tools, availableToolkits, {})

    expect(result).toHaveLength(2)
    expect(result[0].toolkit).toBe(GITHUB_TOOLKIT)
    expect(result[0].tools).toHaveLength(1)
    expect(result[0].tools[0].name).toBe('github_create_issue')
    expect(result[1].toolkit).toBe(SLACK_TOOLKIT)
    expect(result[1].tools).toHaveLength(1)
    expect(result[1].tools[0].name).toBe('slack_send_message')
  })

  it('should handle multiple tools from the same toolkit', () => {
    const tools: AssistantTool[] = [{ name: 'github_create_issue' }, { name: 'github_list_repos' }]

    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(GITHUB_TOOLKIT, [
        createMockTool('github_create_issue', 'Create Issue'),
        createMockTool('github_list_repos', 'List Repos'),
        createMockTool('github_create_pr', 'Create PR'),
      ]),
    ]

    const result = getToolkitsFromConfiguration(tools, availableToolkits, {})

    expect(result).toHaveLength(1)
    expect(result[0].tools).toHaveLength(2)
    expect(result[0].tools.map((t) => t.name)).toContain('github_create_issue')
    expect(result[0].tools.map((t) => t.name)).toContain('github_list_repos')
    expect(result[0].tools.map((t) => t.name)).not.toContain('github_create_pr')
  })

  it('should attach settings to tools when integration_alias matches', () => {
    const githubSetting = createMockSetting('github-main', 'oauth2')
    const slackSetting = createMockSetting('slack-workspace-1', 'oauth2')

    const tools: AssistantTool[] = [
      { name: 'github_create_issue', integration_alias: 'github-main' },
      { name: 'slack_send_message', integration_alias: 'slack-workspace-1' },
    ]

    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(GITHUB_TOOLKIT, [createMockTool('github_create_issue', 'Create Issue')]),
      createMockToolkit(SLACK_TOOLKIT, [createMockTool('slack_send_message', 'Send Message')]),
    ]

    const settings: Record<string, Setting[]> = {
      github: [githubSetting],
      slack: [slackSetting],
    }

    const result = getToolkitsFromConfiguration(tools, availableToolkits, settings)

    expect(result).toHaveLength(2)

    const githubToolkit = result.find((tk) => tk.toolkit === GITHUB_TOOLKIT)
    expect(githubToolkit?.tools[0].settings).toEqual(githubSetting)
    expect(githubToolkit?.tools[0].settings?.alias).toBe('github-main')

    const slackToolkit = result.find((tk) => tk.toolkit === SLACK_TOOLKIT)
    expect(slackToolkit?.tools[0].settings).toEqual(slackSetting)
    expect(slackToolkit?.tools[0].settings?.alias).toBe('slack-workspace-1')
  })

  it('should handle tools without integration_alias', () => {
    const tools: AssistantTool[] = [
      { name: 'github_create_issue' }, // No integration_alias
      { name: 'slack_send_message', integration_alias: 'slack-workspace-1' },
    ]

    const slackSetting = createMockSetting('slack-workspace-1', 'oauth2')

    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(GITHUB_TOOLKIT, [createMockTool('github_create_issue', 'Create Issue')]),
      createMockToolkit(SLACK_TOOLKIT, [createMockTool('slack_send_message', 'Send Message')]),
    ]

    const settings: Record<string, Setting[]> = {
      slack: [slackSetting],
    }

    const result = getToolkitsFromConfiguration(tools, availableToolkits, settings)

    expect(result).toHaveLength(2)

    const githubToolkit = result.find((tk) => tk.toolkit === GITHUB_TOOLKIT)
    expect(githubToolkit?.tools[0].settings).toBeNull()

    const slackToolkit = result.find((tk) => tk.toolkit === SLACK_TOOLKIT)
    expect(slackToolkit?.tools[0].settings).toEqual(slackSetting)
  })

  it('should not attach settings when integration_alias does not match any setting', () => {
    const tools: AssistantTool[] = [
      { name: 'github_create_issue', integration_alias: 'nonexistent-alias' },
    ]

    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(GITHUB_TOOLKIT, [createMockTool('github_create_issue', 'Create Issue')]),
    ]

    const settings: Record<string, Setting[]> = {
      github: [createMockSetting('different-alias', 'oauth2')],
    }

    const result = getToolkitsFromConfiguration(tools, availableToolkits, settings)

    expect(result).toHaveLength(1)
    expect(result[0].tools[0].settings).toBeNull()
  })

  it('should find settings across multiple setting groups', () => {
    const githubSetting = createMockSetting('github-main', 'oauth2')
    const slackSetting = createMockSetting('slack-workspace-1', 'oauth2')
    const jiraSetting = createMockSetting('jira-prod', 'api_key')

    const tools: AssistantTool[] = [
      { name: 'github_create_issue', integration_alias: 'github-main' },
      { name: 'slack_send_message', integration_alias: 'slack-workspace-1' },
      { name: 'jira_create_ticket', integration_alias: 'jira-prod' },
    ]

    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(GITHUB_TOOLKIT, [createMockTool('github_create_issue')]),
      createMockToolkit(SLACK_TOOLKIT, [createMockTool('slack_send_message')]),
      createMockToolkit(JIRA_TOOLKIT, [createMockTool('jira_create_ticket')]),
    ]

    const settings: Record<string, Setting[]> = {
      github: [githubSetting],
      slack: [slackSetting],
      jira: [jiraSetting],
    }

    const result = getToolkitsFromConfiguration(tools, availableToolkits, settings)

    expect(result).toHaveLength(3)

    result.forEach((toolkit) => {
      expect(toolkit.tools[0].settings).not.toBeNull()
      expect(toolkit.tools[0].settings?.alias).toBeDefined()
    })
  })

  it('should handle multiple settings with the same credential type', () => {
    const setting1 = createMockSetting('github-personal', 'oauth2')
    const setting2 = createMockSetting('github-work', 'oauth2')

    const tools: AssistantTool[] = [
      { name: 'github_create_issue', integration_alias: 'github-work' },
    ]

    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(GITHUB_TOOLKIT, [createMockTool('github_create_issue')]),
    ]

    const settings: Record<string, Setting[]> = {
      github: [setting1, setting2],
    }

    const result = getToolkitsFromConfiguration(tools, availableToolkits, settings)

    expect(result).toHaveLength(1)
    expect(result[0].tools[0].settings).toEqual(setting2)
    expect(result[0].tools[0].settings?.alias).toBe('github-work')
  })

  it('should preserve toolkit properties when creating result', () => {
    const tools: AssistantTool[] = [{ name: 'github_create_issue' }]

    const availableToolkits: AssistantToolkit[] = [
      {
        toolkit: GITHUB_TOOLKIT,
        tools: [createMockTool('github_create_issue')],
        label: 'GitHub Integration',
        settings_config: true,
        settings: createMockSetting('default-github'),
        is_external: true,
      },
    ]

    const result = getToolkitsFromConfiguration(tools, availableToolkits, {})

    expect(result).toHaveLength(1)
    expect(result[0].toolkit).toBe(GITHUB_TOOLKIT)
    expect(result[0].label).toBe('GitHub Integration')
    expect(result[0].settings_config).toBe(true)
    expect(result[0].is_external).toBe(true)
  })

  it('should not mutate original toolkit or tool objects', () => {
    const originalTool = createMockTool('github_create_issue', 'Create Issue')
    const originalToolkit = createMockToolkit(GITHUB_TOOLKIT, [originalTool])

    const tools: AssistantTool[] = [
      { name: 'github_create_issue', integration_alias: 'github-main' },
    ]

    const settings: Record<string, Setting[]> = {
      github: [createMockSetting('github-main')],
    }

    getToolkitsFromConfiguration(tools, [originalToolkit], settings)

    // Original tool should not have settings attached
    expect(originalTool.settings).toBeNull()
  })

  it('should handle empty settings object', () => {
    const tools: AssistantTool[] = [
      { name: 'github_create_issue', integration_alias: 'github-main' },
    ]

    const availableToolkits: AssistantToolkit[] = [
      createMockToolkit(GITHUB_TOOLKIT, [createMockTool('github_create_issue')]),
    ]

    const result = getToolkitsFromConfiguration(tools, availableToolkits, {})

    expect(result).toHaveLength(1)
    expect(result[0].tools[0].settings).toBeNull()
  })
})
