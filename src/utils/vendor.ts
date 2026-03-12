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

import { VendorAlias, VendorInstallableVersion, VendorVersion } from '@/types/entity/vendor'

export const getInstallableVersionFromAlias = (alias: VendorAlias): VendorInstallableVersion => {
  return {
    versionId: alias.version,
    aliasId: alias.id,
    status: alias.status,
    updatedAt: alias.updatedAt,
    name: alias.name,
    description: alias.description,
    aiRunId: alias.aiRunId,
  }
}

export const getInstallableVersionFromVersion = (
  version: VendorVersion
): VendorInstallableVersion => {
  return {
    versionId: version.version,
    status: version.status,
    updatedAt: version.updatedAt,
    name: version.name,
    description: version.description,
    aiRunId: version.aiRunId,
  }
}
