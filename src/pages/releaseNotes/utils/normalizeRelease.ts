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

import {
  Item,
  LegacyIssue,
  LegacyRelease,
  RawRelease,
  Release,
  Section,
  SectionCode,
  SECTION_ORDER,
} from '../types'

const createEmptySections = (): Section[] =>
  SECTION_ORDER.map((code) => ({ code, items: [] as Item[] }))

const mapLegacyIssueTypeToSection = (type: string): SectionCode => {
  if (type === 'BUG') return SectionCode.Fixes
  return SectionCode.Features
}

const normalizeLegacyIssue = (issue: LegacyIssue): Item => ({
  title: issue.title,
  issues: [{ key: issue.key, type: issue.type, link: issue.link }],
})

const normalizeLegacyRelease = (release: LegacyRelease): Release => {
  const sections = createEmptySections()

  release.issues.forEach((issue) => {
    const code = mapLegacyIssueTypeToSection(issue.type)
    sections.find((s) => s.code === code)!.items.push(normalizeLegacyIssue(issue))
  })

  return {
    version: release.version,
    date: release.date,
    sections,
  }
}

export const normalizeRelease = (raw: RawRelease): Release => {
  if ('issues' in raw) {
    return normalizeLegacyRelease(raw)
  }

  if (!Array.isArray((raw as Release).sections)) {
    return { ...(raw as Release), sections: [] }
  }

  return raw
}
