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

export interface Issue {
  key: string
  type: string
  link: string
}

export interface Item {
  title: string
  description?: string
  issues: Issue[]
}

export enum SectionCode {
  Highlights = 'highlights',
  Features = 'features',
  Fixes = 'fixes',
}

export const SECTION_LABELS: Record<SectionCode, string> = {
  [SectionCode.Highlights]: 'Highlights',
  [SectionCode.Features]: 'New features and enhancements',
  [SectionCode.Fixes]: 'Fixes',
}

export const VERSION_PARAM = 'version'

export const SECTION_ORDER: SectionCode[] = [
  SectionCode.Highlights,
  SectionCode.Features,
  SectionCode.Fixes,
]

export interface Section {
  code: SectionCode
  items: Item[]
}

export interface Release {
  version: string
  date?: string
  sections: Section[]
}

export interface LegacyIssue {
  key: string
  title: string
  link: string
  type: string
}

export interface LegacyRelease {
  version: string
  date?: string
  issues: LegacyIssue[]
}

export interface SectionedRelease {
  version: string
  date?: string
  sections: Section[]
}

export type RawRelease = LegacyRelease | SectionedRelease
