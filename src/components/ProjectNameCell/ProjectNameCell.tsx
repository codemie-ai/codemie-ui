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

import { useProjectDisplayNames } from '@/hooks/useProjectDisplayNames'

interface ProjectNameCellProps {
  projectName: string
}

/**
 * Renders a project's technical name, surfacing its human display name as a
 * tooltip hint when one exists. Resolves the display name from the current
 * user's project roster, or — for Super Admins viewing a project they are not
 * assigned to — by lazily fetching it.
 */
const ProjectNameCell = ({ projectName }: ProjectNameCellProps) => {
  const displayName = useProjectDisplayNames(projectName).get(projectName)

  if (!displayName) return <>{projectName}</>

  return (
    <span data-tooltip-id="react-tooltip" data-tooltip-content={displayName}>
      {projectName}
    </span>
  )
}

/**
 * Table cell renderer for the project column. Defined at module scope (not
 * inline inside each table component) so it is not treated as a nested
 * component definition (Sonar typescript:S6478).
 */
export const renderProjectNameCell = (item: { project_name: string }) => (
  <ProjectNameCell projectName={item.project_name} />
)

export default ProjectNameCell
