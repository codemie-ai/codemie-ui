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

import { ReactNode } from 'react'

import Accordion from '@/components/Accordion'

import CodeBlockFontSection from './sections/CodeBlockFontSection'
import ColorsSection from './sections/ColorsSection'
import FontSection from './sections/FontSection'
import LogoSection from './sections/LogoSection'

interface SectionProps {
  title: string
  children: ReactNode
}

const Section = ({ title, children }: SectionProps) => (
  <section className="flex flex-col gap-3">
    <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    {children}
  </section>
)

const AdvancedSettings = () => (
  <Accordion title="Advanced settings" defaultOpen={false}>
    <div className="flex flex-col gap-6 p-4">
      <Section title="Font">
        <FontSection />
        <CodeBlockFontSection />
      </Section>
      <Section title="Logo">
        <LogoSection />
      </Section>
      <Section title="Colors">
        <ColorsSection />
      </Section>
    </div>
  </Accordion>
)

export default AdvancedSettings
