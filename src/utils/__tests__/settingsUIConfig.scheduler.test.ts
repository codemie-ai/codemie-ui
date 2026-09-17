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

import { CredentialComponentType } from '@/types/settingsUI'

import { CREDENTIAL_UI_MAPPING } from '../settingsUIConfig'

describe('settingsUIConfig — scheduler schedule field', () => {
  it('uses cronInput type for the schedule field', () => {
    const scheduleField = (CREDENTIAL_UI_MAPPING as any).scheduler?.fields?.schedule
    expect(scheduleField?.type).toBe(CredentialComponentType.cronInput)
  })
})
