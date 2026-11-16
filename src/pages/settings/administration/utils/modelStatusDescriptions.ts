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

import { ModelStatus } from '@/types/entity/configuration'

export const MODEL_STATUS_DESCRIPTIONS: Record<ModelStatus, string> = {
  enabled: 'Available for new and existing work.',
  deprecated: 'Existing work can continue. Cannot be selected for new work or as a new default.',
  disabled:
    'Cannot be used. Existing work uses an available replacement; requests fail if none is available.',
}
