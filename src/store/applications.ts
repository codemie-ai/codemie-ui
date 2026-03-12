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

import { proxy } from 'valtio'

import { Application } from '@/types/entity/application'
import api from '@/utils/api'

interface ApplicationsStore {
  applications: Application[]
  fetchApplications: () => Promise<Application[]>
}

export const applicationsStore = proxy<ApplicationsStore>({
  applications: [],

  async fetchApplications() {
    try {
      const response = await api.get('v1/applications')
      const apps = (await response.json()) as Application[]
      this.applications = apps
      return apps
    } catch (error) {
      console.error('Error fetching applications:', error)
      return []
    }
  },
})
