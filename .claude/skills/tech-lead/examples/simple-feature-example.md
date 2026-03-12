# Example: Simple Feature Implementation

## Scenario

User wants to implement: "Add a category badge to the skill card"

Jira Ticket: EPMCDME-10500

**Ticket Description:**
```
As a user, I want to see the skill category displayed as a badge on the
skill card in the skills list so I can quickly identify skill types.

Acceptance Criteria:
- Show category badge on SkillCard component
- Use appropriate color per category
- Badge should be styled consistently with other badges in the app
```

## Tech Lead Workflow

### Phase 1: Requirement Gathering

**Tech Lead:**
```
To begin, provide the Jira ticket ID (e.g., EPMCDME-12345) to analyze
and implement.
```

**User:** "EPMCDME-10500"

**Tech Lead Actions:**
1. Uses brianna skill: `Skill(skill="brianna", args="get EPMCDME-10500 fields: description,summary")`
2. Receives ticket details

### Phase 2: Technical Analysis

**Guide Consultation:**
```bash
Read .codemie/guides/components/component-patterns.md
Read .codemie/guides/components/reusable-components.md
Read .codemie/guides/styling/styling-guide.md
```

**Codebase Exploration:**
```bash
# Find existing skill card component
Glob pattern="*Skill*.tsx" path="src/"

# Check existing badge/tag patterns
Grep pattern="badge|Badge|Tag|tag" glob="*.tsx" path="src/components/" output_mode="content" -n

# Verify skill type definition for category field
Grep pattern="category" glob="*.ts" path="src/types/entity/" output_mode="content" -n
```

**Findings:**
- Skill card in: `src/pages/skills/components/SkillCard.tsx`
- Badge component exists: `src/components/Badge/Badge.tsx`
- Skill type has `category: string` field
- Similar badge usage found in `AssistantCard.tsx`

### Phase 3: Complexity Assessment

**Tech Lead:**
```markdown
## Implementation Analysis: EPMCDME-10500

### Complexity Rating: Simple

### Reasoning:
- **Single Component**: Only SkillCard component affected
- **Clear Requirements**: Badge placement and styling well-defined
- **Existing Pattern**: Badge component and category field already exist
- **Minimal Scope**: Single file modification (~5-10 lines added)

### Clarity Assessment:
Clear - Requirements specify exactly what to show and where

### Affected Components:
- **SkillCard**: `src/pages/skills/components/SkillCard.tsx` - Add category Badge
```

### Phase 4: Recommendation

**Tech Lead:**
```markdown
### Recommendation

This feature is Simple complexity and can be implemented directly.

**Suggested Approach:**
1. Create feature branch: `EPMCDME-10500`
2. Import Badge component into SkillCard
3. Render `<Badge label={skill.category} />` in the card header area
4. Follow existing badge usage pattern from AssistantCard

Ready to proceed? I'll create the feature branch and start implementation.
```

**User:** "Yes, let's start"

### Phase 5: Implementation

**Branch Creation:**
```bash
# Check current state
git branch --show-current
# Output: main

# Create feature branch
git checkout -b EPMCDME-10500

# Verify
git branch --show-current
# Output: EPMCDME-10500
```

**Code Implementation:**

Read the file first:
```bash
Read file_path="src/pages/skills/components/SkillCard.tsx"
```

Edit to add category badge:
```tsx
// Before:
import React from 'react';
import { Skill } from '@/types/entity/skill';

interface SkillCardProps {
  skill: Skill;
}

export const SkillCard = ({ skill }: SkillCardProps) => {
  return (
    <div className='rounded-lg border border-gray-200 p-4'>
      <h3 className='text-sm font-semibold'>{skill.name}</h3>
      <p className='mt-1 text-xs text-gray-500'>{skill.description}</p>
    </div>
  );
};

// After:
import React from 'react';
import { Badge } from '@/components/Badge/Badge';
import { Skill } from '@/types/entity/skill';

interface SkillCardProps {
  skill: Skill;
}

export const SkillCard = ({ skill }: SkillCardProps) => {
  return (
    <div className='rounded-lg border border-gray-200 p-4'>
      <div className='flex items-start justify-between'>
        <h3 className='text-sm font-semibold'>{skill.name}</h3>
        {skill.category && <Badge label={skill.category} />}
      </div>
      <p className='mt-1 text-xs text-gray-500'>{skill.description}</p>
    </div>
  );
};
```

**Linting:**
```bash
npm run lint:fix
```

**Testing:**
```bash
npm test -- --testPathPattern=SkillCard
```

**Commit:**
```bash
git add src/pages/skills/components/SkillCard.tsx
git commit -m "EPMCDME-10500: Add category badge to SkillCard

- Display skill category as Badge in card header
- Badge is conditionally rendered when category is present
- Follows existing Badge usage pattern from AssistantCard

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push -u origin EPMCDME-10500
```

## Outcome

**Time to Implementation:** ~10 minutes
**Files Changed:** 1
**Lines Added:** 4
**Complexity Accurate:** Yes - Simple assessment was correct
**User Satisfaction:** ✅ Quick, focused implementation following patterns

## Key Success Factors

1. **Quick Guide Lookup**: Component patterns prevented wrong import path
2. **Accurate Complexity**: Simple assessment meant no over-engineering
3. **Direct Implementation**: No specification phase needed
4. **Pattern Following**: Reused existing Badge component consistently
5. **Proper Branch**: Isolated work, clean commit history
