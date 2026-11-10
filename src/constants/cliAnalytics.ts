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

export const NOT_REPORTED_LABEL = 'Not reported'
export const UNATTRIBUTED_LABEL = 'Unattributed'

// Values and filter names follow the backend response vocabulary (scope.py PROJECT_ORIGINS / subscription types).
// `other` = a stored value outside the vocabulary, `unknown` / `none` = a missing one.
export const SUBSCRIPTION_LABELS: Record<string, string> = {
  codemie: 'CodeMie',
  corporate: 'Corporate',
  personal: 'Personal',
  unknown: 'Unknown',
  other: 'Other',
}

export const PROJECT_ORIGIN_LABELS: Record<string, string> = {
  linked_folder: 'Linked folder',
  profile: 'Selected profile',
  registered_repository: 'Registered repository',
  default_project: 'Default project',
  personal: 'Personal project',
  legacy_project: 'Legacy project adoption',
  none: 'Not recorded',
  other: 'Other',
}

export const ROUTE_NOTE_LABELS: Record<string, string> = {
  folder_not_linked: 'Folder not linked to a project',
  linked_project_unavailable: 'Linked project unavailable',
  registered_project_inaccessible: 'Registered project inaccessible',
  registration_ambiguous: 'Repository registration ambiguous',
}

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ label, value }))

export const SUBSCRIPTION_OPTIONS = toOptions(SUBSCRIPTION_LABELS)
export const PROJECT_ORIGIN_OPTIONS = toOptions(PROJECT_ORIGIN_LABELS)
