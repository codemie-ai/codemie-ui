# Styling Guide

> **CRITICAL RULE: Tailwind CSS Only - No Custom CSS**

## 🚨 MANDATORY STYLING APPROACH

**ALL STYLING MUST USE TAILWIND CLASSES EXCLUSIVELY**

1. **Only use Tailwind CSS classes** - No custom CSS, no inline styles, no SCSS
2. **Only use theme tokens from themeTokens** - NEVER use raw color tokens
3. **Only use defined spacing** - Use predefined spacing scale only
4. **Consult tailwind.config.ts** - Verify token names exist before using
5. **Use `cn()` utility** - For combining conditional classes

---

## Table of Contents
1. [Design Token System](#design-token-system)
2. [Theme Colors](#theme-colors)
3. [Spacing Scale](#spacing-scale)
4. [cn() Utility](#cn-utility)
5. [Responsive Design](#responsive-design)
6. [Typography](#typography)
7. [Styling Checklist](#styling-checklist)
8. [Examples](#examples-correct-vs-incorrect)

---

## Design Token System

### 🚨 CRITICAL: Understanding the Token System

All design tokens are defined in `tailwind.config.ts` using a **theme-aware token system**.

#### Token Structure

The token system consists of TWO objects:

1. **`c` object** - Raw color palette (NEVER use directly!)
2. **`themeTokens` object** - Semantic theme tokens (ALWAYS use these!)

```typescript
// ❌ NEVER ACCESS THIS DIRECTLY
const c = {
  neutral: { '0': '#FFFFFF', '100': '#DDDDDD', ... },
  blue: { '50': '#D5E7FC', '400': '#007AFF', ... },
  brand: { a: '#91C75B', b1: '#5677C8', ... },
  // ... other raw colors
}

// ✅ ALWAYS USE TOKENS FROM THIS
const themeTokens = {
  surface: {
    elevated: [c['neutral']['800'], c['neutral']['0']], // [dark, light]
    base: {
      primary: [c['neutral']['925'], c['neutral']['5']],
      secondary: [c['neutral']['875'], c['neutral']['0']],
      // ... more tokens
    }
  },
  border: {
    primary: [c['neutral']['725'], c['neutral']['200']],
    // ... more tokens
  },
  text: {
    primary: [c['neutral']['0'], c['neutral']['775']],
    // ... more tokens
  }
}
```

### How Tokens Work

#### Array-Based Tokens (Most Common)

When a token value is an **array of two colors**:
- **First element** = Dark theme color
- **Second element** = Light theme color

```typescript
// Example from themeTokens
surface: {
  elevated: [c['neutral']['800'], c['neutral']['0']]
  //         ^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^
  //         Dark theme (#2E2E2E)   Light theme (#FFFFFF)
}

// Usage in your code:
<div className="bg-surface-elevated">
  {/* This div will have #2E2E2E background in dark mode */}
  {/* This div will have #FFFFFF background in light mode */}
</div>
```

#### Single-Value Tokens (Same for Both Themes)

When a token value is a **single color** (not an array):
- Same color applies to both themes

```typescript
// Example from themeTokens
'in-progress': {
  primary: c['blue']['300']
  //        Same color for both themes
}

// Usage in your code:
<span className="text-in-progress-primary">In Progress</span>
```

### 🚨 NEVER Use Raw Color Tokens

**UNDER NO CIRCUMSTANCES should you use raw colors from the `c` object directly in your components!**

```tsx
// ❌ ABSOLUTELY WRONG - NEVER DO THIS
<div className="bg-neutral-800">        // DON'T use neutral-*
<div className="bg-blue-400">           // DON'T use blue-*
<div className="bg-brand-a">            // DON'T use brand-*
<div className="text-red-500">          // DON'T use red-*
<div className="border-green-600">      // DON'T use green-*
<div className="bg-purple-accent-4">    // DON'T use purple-*

// ✅ CORRECT - ALWAYS USE THEME TOKENS
<div className="bg-surface-elevated">         // DO use surface-*
<div className="bg-surface-base-primary">     // DO use surface-*
<div className="text-text-primary">           // DO use text-*
<div className="border-border-primary">       // DO use border-*
<div className="text-icon-accent">            // DO use icon-*
```

### When You Need a New Token

If you need a color that doesn't exist in `themeTokens`:

1. **First**: Check if an existing token can work for your use case
2. **If truly needed**: Add it to `themeTokens` in `tailwind.config.ts`
3. **Reference colors from the `c` object** when defining your new token

```typescript
// Example: Adding a new token
const themeTokens = {
  surface: {
    // ... existing tokens
    specific: {
      // ... existing specific tokens
      'my-new-surface': [c['neutral']['750'], c['neutral']['25']]
      //                  ^^^^^^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^
      //                  Reference from c       Reference from c
    }
  }
}

// Then use it in your component:
<div className="bg-surface-specific-my-new-surface">
```

### Token Categories

The `themeTokens` object is organized into semantic categories:

```typescript
themeTokens = {
  surface: {     // Background colors
    elevated,
    interactive: { active, hover },
    base: { primary, secondary, tertiary, ... },
    specific: { card, 'primary-button', 'dropdown-hover', ... }
  },

  border: {      // Border colors
    primary, secondary, tertiary, accent, subtle, ...
    specific: { 'icon-outline', sidebar, 'panel-outline', ... }
  },

  text: {        // Text colors
    primary, secondary, tertiary, quaternary,
    inverse,
    accent: { DEFAULT, hover, status, 'status-hover' },
    specific: { 'navigation-label', input: { ... }, ... }
  },

  icon: {        // Icon colors (use with text- prefix)
    primary, inverse, accent, secondary, tertiary,
    error
  },

  // Status tokens (same name for both bg- and text- prefixes)
  'in-progress': { primary, secondary, tertiary },
  'not-started': { primary, secondary, tertiary },
  interrupted: { primary, secondary, tertiary },
  success: { primary, secondary },
  failed: { primary, secondary, tertiary },
  aborted: { primary, secondary, tertiary },
  advanced: { primary, secondary, tertiary }
}
```

---

## Theme Colors

All tokens below are from the `themeTokens` object. They automatically adapt between `codemieDark` and `codemieLight` themes.

### Surface Colors (Backgrounds)

```css
/* Base Surfaces */
surface-base-primary       /* Used for: Root level backgrounds, main page containers */
surface-base-secondary     /* Used for: Secondary containers, panels, base button backgrounds */
surface-base-tertiary      /* Used for: Tertiary containers, subtle elevated backgrounds */
surface-base-quateary      /* Used for: Quaternary backgrounds, minimal visual hierarchy */
surface-base-content       /* Used for: Form inputs, text areas, editable content fields */
surface-base-sidebar       /* Used for: Sidebar backgrounds, side panel containers */
surface-base-navigation    /* Used for: Navigation bar backgrounds, selected navigation items */
surface-base-chat          /* Used for: Message containers, conversational content areas, modal bodies */
surface-base-float         /* Used for: Floating menus, dropdowns, tooltips, popovers */
surface-base-none          /* Used for: Transparent backgrounds, layered components */

/* Interactive Surfaces */
surface-interactive-hover  /* Used for: Hover state backgrounds for interactive elements */
surface-interactive-active /* Used for: Active/pressed state backgrounds, selected items */

/* Elevated Surfaces */
surface-elevated           /* Used for: Elevated panels, cards with shadow, prominent containers */

/* Specific Surfaces */
surface-specific-card                         /* Used for: Card component backgrounds */
```

### Border Colors

```css
/* Primary Borders */
border-primary           /* Used for: Default borders on inputs, cards, containers, dividers */
border-secondary         /* Used for: Secondary borders, lighter dividers, nested elements */
border-tertiary          /* Used for: Subtle borders, less prominent separators */
border-quaternary        /* Used for: Quaternary borders, minimal emphasis outlines */
border-accent            /* Used for: Accent borders for highlighted or emphasized elements */
border-subtle            /* Used for: Most subtle borders, barely visible dividers */
border-structural        /* Used for: Major structural divisions, layout boundaries */
border-focus             /* Used for: Focus indicators for keyboard navigation */
border-error             /* Used for: Error state borders, validation failures */
border-error-hover       /* Used for: Error border hover states, destructive action hovers */

/* Specific Borders */
border-specific-interactive-outline    /* Used for: Interactive element outlines, clickable previews */
border-specific-panel-outline          /* Used for: Panel containers, content blocks, widget borders */
border-specific-icon-outline           /* Used for: Icon wrapper borders, icon button outlines */
```

### Text Colors

```css
/* Primary Text */
text-primary        /* Used for: Primary body content, main headings, button labels, form labels */
text-secondary      /* Used for: Secondary content, supporting text, disabled states */
text-tertiary       /* Used for: Tertiary content, descriptions, helper text */
text-quaternary     /* Used for: Subtle text, metadata, timestamps, hints */
text-inverse        /* Used for: Text on dark/inverted backgrounds */

/* Accent Text */
text-accent              /* Used for: Links, interactive text, primary actions, emphasized content */
text-accent-hover        /* Used for: Hover states for accent text and links */
text-accent-status       /* Used for: Status labels, tags, badges with accent color */
text-accent-status-hover /* Used for: Hover states for status elements */

/* Semantic Text */
text-heading        /* Used for: Section headings, structural titles */
text-info           /* Used for: Informational messages, help text */
text-error          /* Used for: Error messages, validation feedback, warnings */
text-error-hover    /* Used for: Hover states for error/destructive actions */

/* Specific Text */
text-specific-input-placeholder    /* Used for: Input placeholders, empty state hints */
```

### Icon Colors

```css
/* Primary Icons */
icon-primary          /* Used for: Standard icon color, default UI icons */
icon-primary-a70      /* Used for: Subtle icons with reduced opacity */
icon-inverse          /* Used for: Icons on dark/inverted backgrounds */
icon-inverse-a70      /* Used for: Subtle inverse icons with reduced opacity */

/* Accent Icons */
icon-accent           /* Used for: Interactive icons, emphasized actions */
icon-accent-hover     /* Used for: Hover states for accent icons */
icon-accent-a70       /* Used for: Subtle accent icons with reduced opacity */
icon-accent-a40       /* Used for: Very subtle accent icons with minimal opacity */

/* Secondary Icons */
icon-secondary        /* Used for: Secondary emphasis icons, supporting actions */
icon-tertiary         /* Used for: Minimal emphasis icons, decorative icons */
icon-error            /* Used for: Error state icons, warning indicators */
icon-error-hover      /* Used for: Hover states for error/warning icons */
```

### Status Colors

Status colors follow a three-tier hierarchy with consistent naming across all statuses.

**Token Variants:**
- **primary**: Solid fills for status indicators (dots, progress bars, solid buttons)
- **secondary**: Light/subtle backgrounds, borders, or secondary indicators
- **tertiary**: Very light backgrounds for badge containers and cards

```css
/* Success */
success-primary       /* Used for: Solid success fills, status dots, primary text */
success-secondary     /* Used for: Light success backgrounds, secondary fills */

/* Failed/Error */
failed-primary        /* Used for: Solid error fills, primary error text */
failed-secondary      /* Used for: Error borders, status indicators, secondary error text */
failed-tertiary       /* Used for: Light error backgrounds, error container fills */

/* In Progress */
in-progress-primary       /* Used for: Active progress indicators, animated status dots, primary text */
in-progress-secondary     /* Used for: Progress borders, secondary indicators */
in-progress-tertiary      /* Used for: Light progress backgrounds, container fills */

/* Not Started */
not-started-primary       /* Used for: Inactive indicators, not-started status dots, primary text */
not-started-secondary     /* Used for: Not-started borders, secondary indicators */
not-started-tertiary      /* Used for: Light not-started backgrounds, container fills */

/* Interrupted/Pending */
interrupted-primary       /* Used for: Pending status dots, primary pending text */
interrupted-secondary     /* Used for: Pending borders, secondary indicators */
interrupted-tertiary      /* Used for: Light pending backgrounds, container fills */

/* Aborted/Warning */
aborted-primary       /* Used for: Warning indicators, aborted status dots, primary warning text */
aborted-secondary     /* Used for: Warning borders, secondary indicators */
aborted-tertiary      /* Used for: Light warning backgrounds, warning container fills */

/* Advanced */
advanced-primary      /* Used for: Advanced status indicators, primary text */
advanced-secondary    /* Used for: Advanced borders, secondary indicators */
advanced-tertiary     /* Used for: Light advanced backgrounds, container fills */
```

### 🚨 DO NOT Use Base Colors Directly

These raw colors exist in the config but **should NEVER be used directly**:

```css
/* ❌ NEVER USE THESE DIRECTLY */
bg-neutral-*, text-neutral-*     /* Raw neutral grays */
bg-blue-*, text-blue-*           /* Raw blues */
bg-red-*, text-red-*             /* Raw reds */
bg-green-*, text-green-*         /* Raw greens */
bg-yellow-*, text-yellow-*       /* Raw yellows */
bg-purple-*, text-purple-*       /* Raw purples */
bg-brand-*, text-brand-*         /* Raw brand colors */
bg-white-*, text-white-*         /* Raw white variants */
bg-black-*, text-black-*         /* Raw black variants */

/* ✅ INSTEAD USE SEMANTIC TOKENS */
bg-surface-*, text-text-*, border-border-*, text-icon-*
```

---

## Spacing Scale

### Standard Tailwind Spacing

**MUST USE ONLY THESE VALUES**

```tsx
className="p-0"    // 0px
className="p-1"    // 4px
className="p-2"    // 8px
className="p-3"    // 12px
className="p-4"    // 16px
className="p-5"    // 20px
className="p-6"    // 24px
className="p-8"    // 32px
className="p-10"   // 40px
className="p-12"   // 48px
className="p-16"   // 64px
className="p-20"   // 80px
className="p-24"   // 96px
```

Apply to all spacing utilities: `m-`, `p-`, `gap-`, `space-`, `top-`, `right-`, `bottom-`, `left-`, etc.

### Custom Project Spacing

```tsx
// Layout-specific spacing - USE THESE FOR LAYOUT
className="h-navbar"              // 72px - Navigation bar height
className="h-navbar-expanded"     // 196px - Expanded nav height
className="w-sidebar"             // 308px - Sidebar width
className="ml-sidebar-collapsed"  // 380px - Content margin when sidebar collapsed
className="ml-sidebar-expanded"   // 505px - Content margin when sidebar expanded
className="w-workflow-exec-sidebar" // 308px - Workflow execution sidebar
className="h-layout-header"       // 56px - Layout header height
className="min-h-layout-header"   // 56px - Minimum layout header height
className="h-card"                // 158px - Standard card height
className="max-w-chat-content"    // 64rem - Maximum chat content width
```

---

## cn() Utility

### What is cn()?

The `cn()` utility function combines Tailwind classes intelligently, handling:
- Conditional classes
- Class merging
- Duplicate resolution

### Import

```typescript
import { cn } from '@/utils/utils'
```

### Usage Examples

#### Basic Combination

```tsx
<div className={cn('px-4 py-2', className)}>
  Content
</div>
```

#### Conditional Classes

```tsx
const Button = ({ variant, disabled, className }) => (
  <button
    className={cn(
      // Base styles
      'px-4 py-2 rounded-lg font-medium transition',
      // Conditional styles
      {
        'bg-surface-specific-primary-button text-text-accent': variant === 'primary',
        'bg-surface-specific-button-secondary text-text-accent': variant === 'secondary',
        'opacity-50 cursor-not-allowed': disabled
      },
      // Additional custom classes
      className
    )}
  >
    {children}
  </button>
)
```

#### Multiple Conditions

```tsx
<div
  className={cn(
    'flex items-center',
    {
      'justify-start': align === 'left',
      'justify-center': align === 'center',
      'justify-end': align === 'right',
      'gap-2': size === 'small',
      'gap-4': size === 'medium',
      'gap-6': size === 'large'
    }
  )}
>
```

---

## Responsive Design

### Breakpoints

```tsx
// Standard Tailwind breakpoints
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Custom project breakpoints (from tailwind.config.ts)
'card-grid-2': '1300px'
'card-grid-3': '1600px'
'view-details-bp': '1200px'

// Usage
<div className="card-grid-2:grid-cols-2">
```

### Responsive Patterns

```tsx
// Mobile-first approach
<div className="text-sm md:text-base lg:text-lg">

// Hide/show at breakpoints
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>

// Responsive spacing
<div className="p-4 md:p-6 lg:p-8">

// Responsive layout
<div className="flex-col md:flex-row">
```

---

## Typography

### Heading Sizes

```tsx
className="text-h1"    // 32px heading
className="text-h2"    // 24px heading
className="text-h3"    // 16px heading
className="text-h4"    // 14px heading
className="text-h5"    // 12px heading
```

### Text Sizes

```tsx
className="text-sm"    // Small text
className="text-xs"    // Extra small text
className="text-base"  // Base text (14px)
className="text-lg"    // Large text
```

### Font Weights

```tsx
className="font-normal"    // Regular weight
className="font-medium"    // Medium weight
className="font-semibold"  // Semi-bold weight
className="font-bold"      // Bold weight
```

---

## Styling Checklist

**Before writing any styling code, verify:**

- [ ] ✅ Using only Tailwind CSS classes (no custom CSS, no inline styles)
- [ ] ✅ All colors exist in `tailwind.config.ts`
- [ ] ✅ All spacing values are from the predefined scale
- [ ] ✅ Using `cn()` utility for combining conditional classes
- [ ] ✅ No arbitrary values like `px-[15px]` or `bg-[#FF0000]`
- [ ] ✅ No raw color tokens like `bg-neutral-800`, `text-blue-400`, `border-brand-a`
- [ ] ✅ Checked responsive breakpoints exist in config
- [ ] ✅ Using semantic token names (e.g., `text-text-primary`, `bg-surface-elevated`)
- [ ] ✅ Tokens work in both `dark` and `light` themes

**When you need a color that doesn't exist:**
1. First, check if there's a similar existing token you can use
2. If truly needed, add it to `themeTokens` in `tailwind.config.ts`
3. Reference colors from the `c` object when defining your new token
4. Never use raw colors directly in components

---

## Examples: Correct vs Incorrect

### ✅ CORRECT: Using Theme Tokens

```tsx
const GoodComponent = () => (
  <div className={cn(
    'bg-surface-elevated border-border-primary rounded-lg',
    'p-6 mt-4 mb-8 gap-4',
    'text-text-primary hover:text-text-accent',
    'transition-colors duration-200'
  )}>
    Content with proper styling using theme tokens
  </div>
)
```

### ❌ WRONG: Using Raw Colors or Arbitrary Values

```tsx
const BadComponent = () => (
  <>
    {/* ❌ NEVER use raw color tokens */}
    <div className="bg-neutral-800 text-blue-400 border-brand-a">
      Using raw color tokens - WRONG!
    </div>

    {/* ❌ NEVER use arbitrary values */}
    <div className="bg-[#f0f0f0] border-[#cccccc] p-[18px]">
      Using arbitrary values - WRONG!
    </div>

    {/* ❌ NEVER use inline styles */}
    <div style={{ color: '#333333', padding: '18px' }}>
      Using inline styles - WRONG!
    </div>
  </>
)
```

### ✅ CORRECT: Theme-Aware Button Styling

```tsx
const ThemeButton = ({ variant, children }) => (
  <button className={cn(
    'px-4 py-2 rounded-lg font-medium transition-colors duration-200',
    {
      'bg-surface-specific-primary-button text-text-accent border-border-quaternary':
        variant === 'primary',
      'bg-surface-elevated text-text-primary border-border-primary':
        variant === 'secondary',
    }
  )}>
    {children}
  </button>
)
```

### ✅ CORRECT: Status Badge with Theme Tokens

```tsx
const StatusBadge = ({ status }) => (
  <span className={cn(
    'px-3 py-1 rounded-full text-xs font-medium',
    {
      'bg-success-primary text-text-inverse': status === 'success',
      'bg-failed-primary text-text-inverse': status === 'error',
      'bg-aborted-primary text-text-inverse': status === 'warning',
      'bg-in-progress-primary text-text-inverse': status === 'in-progress',
    }
  )}>
    {status}
  </span>
)
```

### ✅ CORRECT: Responsive Card Grid

```tsx
const CardGrid = ({ children }) => (
  <div className={cn(
    'grid grid-cols-1',
    'md:grid-cols-2',
    'lg:grid-cols-3',
    'gap-4 md:gap-6',
    'p-4 md:p-6 lg:p-8'
  )}>
    {children}
  </div>
)
```

### ❌ WRONG: Custom CSS

```tsx
// ❌ NEVER DO THIS
<style>
  .my-custom-class {
    background: #f0f0f0;
    padding: 18px;
  }
</style>

<div className="my-custom-class">Content</div>
```

### ✅ CORRECT: Tailwind Only with Theme Tokens

```tsx
// ✅ ALWAYS DO THIS
<div className="bg-surface-elevated p-6">
  Content
</div>
```

---

## Common Styling Patterns

### Card Component

```tsx
const Card = ({ children, className }) => (
  <div className={cn(
    'bg-surface-specific-card',
    'border border-border-primary',
    'rounded-lg',
    'p-6',
    'shadow-block',
    'hover:border-border-secondary',
    'transition-colors duration-200',
    className
  )}>
    {children}
  </div>
)
```

### Input Styling

```tsx
const StyledInput = ({ error, className }) => (
  <input
    className={cn(
      'w-full px-4 py-2',
      'bg-surface-base-content',
      'border rounded-lg',
      'text-text-primary',
      'placeholder:text-text-specific-input-placeholder',
      'transition-colors duration-200',
      error ? 'border-border-error' : 'border-border-primary',
      !error && 'hover:border-border-secondary focus:border-border-focus',
      'focus:outline-none',
      className
    )}
  />
)
```

### Loading Skeleton

```tsx
const LoadingSkeleton = () => (
  <div className="bg-surface-elevated rounded-lg p-4 border border-border-specific-panel-outline animate-pulse">
    <div className="h-4 bg-border-specific-panel-outline rounded w-1/2 mb-4"></div>
    <div className="h-12 bg-border-specific-panel-outline rounded w-3/4"></div>
  </div>
)
```
---

## Related Guides
- [Theme Management](./theme-management.md) - Theme customization
- [Responsive Design](./responsive-design.md) - Responsive patterns
- [Component Patterns](../components/component-patterns.md) - Component structure
