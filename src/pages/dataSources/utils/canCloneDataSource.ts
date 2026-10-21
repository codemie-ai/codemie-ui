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

import { isBedrockIndex, isPlatformIndex } from '@/utils/indexing'

/** True when the user can work in at least one project they may create a data source in. */
export const hasCreatableProject = (
  user?: { isAdmin?: boolean; applications?: readonly string[] } | null
): boolean => !!user?.isAdmin || !!user?.applications?.length

/**
 * Whether the Clone action applies to a data source. Bedrock and platform sources are excluded. Provider sources whose provider was
 * deleted cannot be detected from list items (no provider_fields), so the clone page blocks them.
 */
export const canCloneDataSource = (
  index: { index_type: string },
  { hasCreatableProject: hasProject }: { hasCreatableProject: boolean }
): boolean => hasProject && !isBedrockIndex(index) && !isPlatformIndex(index)
