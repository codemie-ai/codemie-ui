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

import CheckboxesSvg from '@/assets/icons/checkboxes.svg?react'
import CloudDataSvg from '@/assets/icons/cloud-data.svg?react'
import CodeSvg from '@/assets/icons/code.svg?react'
import CogSvg from '@/assets/icons/cog.svg?react'
import ConnectionSvg from '@/assets/icons/connection.svg?react'
import FileSystemSvg from '@/assets/icons/filesystem.svg?react'
import FingerprintSvg from '@/assets/icons/fingerprint.svg?react'
import McpSvg from '@/assets/icons/mcp.svg?react'
import NotificationSvg from '@/assets/icons/notification.svg?react'
import PluginSvg from '@/assets/icons/plugin.svg?react'
import ProjectManagementSvg from '@/assets/icons/project_management.svg?react'
import ProtectSvg from '@/assets/icons/protect.svg?react'
import ResearchSvg from '@/assets/icons/research.svg?react'
import ServerSvg from '@/assets/icons/server.svg?react'
import VcsSvg from '@/assets/icons/vcs.svg?react'
import { TOOLKITS, ToolkitType } from '@/constants/assistants'

interface ToolkitIconProps {
  toolkitType: ToolkitType
}

const ToolkitIcon = ({ toolkitType }: ToolkitIconProps) => {
  const toolkitToIcon = {
    [TOOLKITS.Git]: <VcsSvg />,
    [TOOLKITS.VCS]: <VcsSvg />,
    [TOOLKITS.CodebaseTools]: <CodeSvg />,
    [TOOLKITS.KnowledgeBase]: <ResearchSvg />,
    [TOOLKITS.Research]: <ResearchSvg />,
    [TOOLKITS.Cloud]: <ServerSvg />,
    [TOOLKITS.AzureDevOpsWiki]: <ServerSvg />,
    [TOOLKITS.AzureDevOpsWorkItem]: <ServerSvg />,
    [TOOLKITS.AzureDevOpsTestPlan]: <ServerSvg />,
    [TOOLKITS.AccessManagement]: <FingerprintSvg />,
    [TOOLKITS.ProjectManagement]: <ProjectManagementSvg />,
    [TOOLKITS.Plugin]: <PluginSvg />,
    [TOOLKITS.OpenAPI]: <ConnectionSvg />,
    [TOOLKITS.Notification]: <NotificationSvg />,
    [TOOLKITS.DataManagement]: <CloudDataSvg />,
    [TOOLKITS.FileSystem]: <FileSystemSvg />,
    [TOOLKITS.QualityAssurance]: <ProtectSvg />,
    [TOOLKITS.ITServiceManagement]: <CheckboxesSvg />,
    [TOOLKITS.MCP]: <McpSvg />,
  }

  return toolkitToIcon[toolkitType] || <CogSvg />
}

export default ToolkitIcon
