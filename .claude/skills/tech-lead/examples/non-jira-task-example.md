# Example: Non-Jira Task Implementation

## Scenario

User wants to implement: "Improve form validation messages to be more user-friendly"

No Jira Ticket - User-provided task description

## Tech Lead Workflow

### Phase 1: Requirement Gathering

**Tech Lead:**
```
I'll help you implement this task. Let me first understand the requirements better.

## Task Requirements

**Goal**: Improve form validation messages to be more user-friendly

Before we proceed, I need some clarification:
```

**Tech Lead uses AskUserQuestion:**
```json
{
  "questions": [
    {
      "question": "Which forms should be improved?",
      "header": "Scope",
      "multiSelect": false,
      "options": [
        {
          "label": "All forms",
          "description": "Comprehensive improvement across all forms in the app"
        },
        {
          "label": "Assistant creation/edit form",
          "description": "Focus on the assistant management forms"
        },
        {
          "label": "Skill creation/edit form",
          "description": "Focus on the skills management forms"
        }
      ]
    },
    {
      "question": "What aspects should be improved?",
      "header": "Improvements",
      "multiSelect": true,
      "options": [
        {
          "label": "Error message clarity",
          "description": "Make messages more descriptive and actionable"
        },
        {
          "label": "Field-level feedback",
          "description": "Show which specific field has an issue and why"
        },
        {
          "label": "Real-time validation",
          "description": "Validate on change instead of only on submit"
        }
      ]
    }
  ]
}
```

**User Responses:**
- Scope: Skill creation/edit form
- Improvements: Error message clarity, Field-level feedback

**Tech Lead:**
```markdown
## Task Requirements (Finalized)

**Goal**: Improve validation error messages in the skill creation/edit form

**Acceptance Criteria**:
- Error messages are clear and actionable (e.g., "Name is required" → "Please enter a skill name")
- Validation messages specify exactly what needs to be fixed
- Messages use consistent tone across all fields
- Existing React Hook Form + Yup pattern maintained

**Scope**: Skill form (create and edit)

**Branch Name**: What would you like to name the feature branch?
Suggested: `feature/improve-skill-form-validation`
```

**User:** "Let's use feature/improve-skill-form-validation"

### Phase 2: Technical Analysis

**Guide Consultation:**
```bash
Read .codemie/guides/patterns/form-patterns.md
Read .codemie/guides/development/error-handling-patterns.md
```

**Codebase Exploration:**
```bash
# Find skill form files
Glob pattern="*Skill*Form*" path="src/"
Glob pattern="*skill*form*" path="src/"

# Find existing Yup validation schemas
Grep pattern="yup\.|\.required\|\.min\|\.max" glob="*.ts" path="src/pages/skills/" output_mode="content" -n

# Check how error messages are currently displayed
Grep pattern="errors\." glob="*.tsx" path="src/pages/skills/" output_mode="content" -n
```

**Findings:**
- Skill form hook in: `src/pages/skills/hooks/useSkillForm.ts`
- Form component in: `src/pages/skills/components/SkillForm.tsx`
- Yup schema defined in form hook, messages are minimal ("Required")
- Errors displayed via `<FormErrorMessage>` component from `src/components/form/`

### Phase 3: Complexity Assessment

**Tech Lead:**
```markdown
## Implementation Analysis: Improve Skill Form Validation

### Complexity Rating: Simple

### Reasoning:
- **Single Area**: Only skill form validation schema affected
- **Clear Requirements**: Well-defined goals after clarification
- **Existing Pattern**: Yup schema enhancement, no architecture change
- **Minimal Scope**: 1-2 files (form hook schema, possibly constants)

### Clarity Assessment:
Clear - After clarification, requirements are well-defined and scoped

### Affected Components:
- **Skill Form Hook**: `src/pages/skills/hooks/useSkillForm.ts` - Update Yup messages
- **Skill Constants** (optional): `src/constants/skills.ts` - Extract message strings
```

### Phase 4: Recommendation

**Tech Lead:**
```markdown
### Recommendation

This task is Simple complexity and can be implemented directly.

**Suggested Approach:**
1. Create feature branch: `feature/improve-skill-form-validation`
2. Update Yup schema in `useSkillForm.ts` with descriptive messages
3. Extract message strings to `src/constants/skills.ts` for maintainability
4. Verify messages display correctly via `<FormErrorMessage>` component
5. Test with empty/invalid submissions

**Key Patterns to Follow:**
- Use Yup `.required('message')`, `.min(n, 'message')` for all rules
- Keep messages user-friendly (imperative tone: "Enter a name..." not "Name is invalid")
- Extract to constants to avoid magic strings
- Do NOT change form structure or React Hook Form setup

Ready to proceed? I'll create the feature branch and start implementation.
```

**User:** "Yes, let's do it"

### Phase 5: Implementation

**Branch Creation:**
```bash
# Check current state
git branch --show-current
# Output: main

# Update main first
git pull origin main

# Create feature branch
git checkout -b feature/improve-skill-form-validation

# Verify
git branch --show-current
# Output: feature/improve-skill-form-validation
```

**Code Implementation:**

**Step 1: Add Validation Message Constants**

```ts
// In src/constants/skills.ts - add validation messages section:

export const SKILL_FORM_VALIDATION = {
  name: {
    required: 'Please enter a skill name',
    min: 'Skill name must be at least 2 characters',
    max: 'Skill name cannot exceed 100 characters',
  },
  description: {
    required: 'Please add a description for this skill',
    max: 'Description cannot exceed 500 characters',
  },
  category: {
    required: 'Please select a category for this skill',
  },
} as const;
```

**Step 2: Update Yup Schema with Descriptive Messages**

```ts
// In src/pages/skills/hooks/useSkillForm.ts

// Before:
const schema = yup.object({
  name: yup.string().required().min(2),
  description: yup.string().required(),
  category: yup.string().required(),
});

// After:
import { SKILL_FORM_VALIDATION } from '@/constants/skills';

const schema = yup.object({
  name: yup
    .string()
    .required(SKILL_FORM_VALIDATION.name.required)
    .min(2, SKILL_FORM_VALIDATION.name.min)
    .max(100, SKILL_FORM_VALIDATION.name.max),
  description: yup
    .string()
    .required(SKILL_FORM_VALIDATION.description.required)
    .max(500, SKILL_FORM_VALIDATION.description.max),
  category: yup
    .string()
    .required(SKILL_FORM_VALIDATION.category.required),
});
```

**Linting:**
```bash
npm run lint:fix
```

**Testing:**
```bash
npm test -- --testPathPattern=useSkillForm
```

**Commit Changes:**
```bash
git add src/constants/skills.ts
git add src/pages/skills/hooks/useSkillForm.ts

git commit -m "feature/improve-skill-form-validation: Improve skill form validation messages

- Add SKILL_FORM_VALIDATION constants with descriptive, user-friendly messages
- Update Yup schema to use specific messages for name, description, category
- Extract validation strings to constants to avoid magic strings
- Messages follow imperative tone: 'Please enter...' pattern

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

git push origin feature/improve-skill-form-validation
```

### Phase 6: Create Pull Request (Optional)

**Tech Lead:**
```markdown
Implementation complete! Validation messages are now:
- Clear and actionable
- User-friendly (no technical jargon)
- Consistent across all skill form fields
- Extracted to constants for maintainability

**Changes Summary:**
- 2 files modified
- ~25 lines added
- Improved user experience for skill form errors
- All tests passing ✅

Would you like me to create a pull request for review?
```

## Outcome

**Time to Implementation:** ~30 minutes
**Files Changed:** 2
**Lines Added:** 25
**Complexity Accurate:** Yes - Simple assessment was appropriate
**User Satisfaction:** ✅ Improved UX, clear messages, constants pattern followed

## Key Success Factors

1. **Clarifying Questions**: Narrowed scope from "all forms" to "skill form"
2. **Structured Requirements**: Documented finalized requirements clearly
3. **Proper Branch Naming**: Feature branch with descriptive name
4. **Pattern Following**: Used existing Yup + React Hook Form pattern
5. **Constants Extraction**: No magic strings, maintainable messages
6. **Comprehensive Testing**: Verified schema validation output
7. **Clear Commits**: Descriptive commit message with context

## Comparison: Without Tech Lead Skill

**Without structured approach:**
- ❌ Might improve all forms (scope creep)
- ❌ Inconsistent message formats across forms
- ❌ Messages scattered as magic strings in schema
- ❌ Unclear which fields were updated

**With Tech Lead Skill:**
- ✅ Scoped correctly through clarification
- ✅ Consistent message format (imperative tone)
- ✅ Messages in constants for easy maintenance
- ✅ Follows Yup + React Hook Form project pattern
