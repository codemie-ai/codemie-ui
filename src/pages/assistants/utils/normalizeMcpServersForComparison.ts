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

import { MCPServerDetails } from '@/types/entity/mcp'

/**
 * Normalizes MCP servers for comparison by converting nested settings to IDs
 * @param mcpServers - Array of MCP server details
 * @returns Normalized MCP servers with settings reduced to IDs
 */
export const normalizeMcpServersForComparison = (mcpServers: MCPServerDetails[]) => {
  return mcpServers.map((server) => ({
    ...server,
    settings: server.settings?.id || null,
    tools: server.tools || [],
  }))
}
