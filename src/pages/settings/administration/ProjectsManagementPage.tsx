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

import { FC } from 'react'

import ProjectsManagementDefault from './projectsManagement/ProjectsManagementDefault'
import ProjectsManagementFull from './projectsManagement/ProjectsManagementFull'

const ProjectsManagementPage: FC = () => {
  const isUserManagementEnabled = window._env_?.VITE_ENABLE_USER_MANAGEMENT === 'true'

  // Show simple view when user management is disabled (production default)
  // Show full table view when user management is enabled
  return isUserManagementEnabled ? <ProjectsManagementFull /> : <ProjectsManagementDefault />
}

export default ProjectsManagementPage
