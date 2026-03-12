# Responsive Design Guide

> **Responsive design patterns using Tailwind CSS**

## Table of Contents
1. [Overview](#overview)
2. [Breakpoints](#breakpoints)
3. [Mobile-First Approach](#mobile-first-approach)
4. [Common Patterns](#common-patterns)
5. [Layout Strategies](#layout-strategies)
6. [Component Responsiveness](#component-responsiveness)

---

## Overview

### General Guidelines

- Use **Tailwind responsive utilities** exclusively
- Follow **mobile-first** approach (base styles for mobile, add larger breakpoints)
- Test on multiple screen sizes
- Consider touch targets on mobile (min 44x44px)
- Hide/show elements appropriately across breakpoints

---

## Breakpoints

### Tailwind Breakpoints

| Prefix | Min Width | Typical Device |
|--------|-----------|----------------|
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops, small desktops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large desktops |

### Usage

```typescript
// Mobile first - base styles apply to all sizes
<div className="p-4 sm:p-6 lg:p-8">
  {/*
    padding: 16px (mobile)
    padding: 24px (sm and up)
    padding: 32px (lg and up)
  */}
</div>
```

---

## Mobile-First Approach

### Pattern

1. Write base styles for mobile
2. Add larger breakpoints as needed
3. Override/enhance at each breakpoint

### Example

```typescript
// ✅ DO - Mobile first
<div className="
  flex flex-col         // Mobile: stack vertically
  sm:flex-row          // Small+: horizontal
  lg:gap-8             // Large+: more spacing
">

// ❌ DON'T - Desktop first (not Tailwind way)
<div className="
  flex flex-row
  sm:flex-col
">
```

---

## Common Patterns

### Responsive Grid

```typescript
// Auto-responsive grid
<div className="
  grid
  grid-cols-1          // Mobile: 1 column
  sm:grid-cols-2       // Small+: 2 columns
  lg:grid-cols-3       // Large+: 3 columns
  xl:grid-cols-4       // XL+: 4 columns
  gap-4
">
  {items.map(item => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

### Responsive Text

```typescript
// Adjust font size by screen
<h1 className="
  text-2xl            // Mobile: 24px
  sm:text-3xl         // Small+: 30px
  lg:text-4xl         // Large+: 36px
">
  Heading
</h1>

<p className="
  text-sm             // Mobile: 14px
  lg:text-base        // Large+: 16px
">
  Body text
</p>
```

### Responsive Spacing

```typescript
// Adjust padding/margin by screen
<section className="
  px-4 py-8          // Mobile: 16px horizontal, 32px vertical
  sm:px-6 sm:py-10   // Small+: 24px horizontal, 40px vertical
  lg:px-8 lg:py-12   // Large+: 32px horizontal, 48px vertical
">
  Content
</section>
```

### Hide/Show by Breakpoint

```typescript
// Show on mobile, hide on desktop
<button className="block lg:hidden">
  Mobile Menu
</button>

// Hide on mobile, show on desktop
<nav className="hidden lg:block">
  Desktop Navigation
</nav>

// Show different components
<div>
  <MobileView className="block md:hidden" />
  <DesktopView className="hidden md:block" />
</div>
```

---

## Layout Strategies

### Sidebar Layout

```typescript
// Responsive sidebar + main content
<div className="flex flex-col lg:flex-row">
  {/* Sidebar */}
  <aside className="
    w-full             // Mobile: full width
    lg:w-64            // Large+: fixed width
    lg:flex-shrink-0
  ">
    Sidebar
  </aside>

  {/* Main content */}
  <main className="flex-1">
    Content
  </main>
</div>
```

### Container Widths

```typescript
// Responsive container
<div className="
  container          // Responsive max-width
  mx-auto            // Center horizontally
  px-4               // Mobile padding
  sm:px-6            // Small+ padding
  lg:px-8            // Large+ padding
">
  Content
</div>

// Custom max-width
<div className="
  max-w-full         // Mobile: full width
  md:max-w-2xl       // Medium+: 672px max
  lg:max-w-4xl       // Large+: 896px max
  mx-auto
">
  Content
</div>
```

### Navigation Patterns

```typescript
// Mobile hamburger, desktop horizontal
function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="block lg:hidden"
      >
        Menu
      </button>

      {/* Desktop nav */}
      <ul className="hidden lg:flex lg:gap-4">
        <li><Link to="/assistants">Assistants</Link></li>
        <li><Link to="/workflows">Workflows</Link></li>
        <li><Link to="/settings">Settings</Link></li>
      </ul>

      {/* Mobile nav (dropdown) */}
      {mobileMenuOpen && (
        <ul className="
          flex flex-col
          lg:hidden
          absolute top-16 left-0 right-0
          bg-menu
          p-4
        ">
          <li><Link to="/assistants">Assistants</Link></li>
          <li><Link to="/workflows">Workflows</Link></li>
          <li><Link to="/settings">Settings</Link></li>
        </ul>
      )}
    </nav>
  )
}
```

---

## Component Responsiveness

### Responsive Cards

```typescript
<div className="
  p-4                // Mobile: 16px padding
  sm:p-6             // Small+: 24px padding
  rounded-lg
  flex flex-col      // Mobile: stack
  sm:flex-row        // Small+: horizontal
  sm:items-center
  gap-4
">
  <img
    src={avatar}
    className="
      w-16 h-16        // Mobile: 64x64
      sm:w-20 sm:h-20  // Small+: 80x80
      rounded-full
    "
  />
  <div className="flex-1">
    <h3 className="text-lg sm:text-xl">{title}</h3>
    <p className="text-sm sm:text-base">{description}</p>
  </div>
</div>
```

### Responsive Tables

```typescript
// Desktop: table, Mobile: stacked cards
function ResponsiveTable({ data }: { data: Item[] }) {
  return (
    <>
      {/* Desktop table */}
      <table className="hidden lg:table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.status}</td>
              <td>{item.date}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="lg:hidden space-y-4">
        {data.map(item => (
          <div key={item.id} className="p-4 border rounded-lg">
            <div className="font-semibold">{item.name}</div>
            <div className="text-sm text-gray-600">{item.status}</div>
            <div className="text-xs text-gray-400">{item.date}</div>
          </div>
        ))}
      </div>
    </>
  )
}
```

### Responsive Forms

```typescript
function AssistantForm() {
  return (
    <form className="
      space-y-4          // Mobile: vertical spacing
      sm:space-y-6       // Small+: more spacing
    ">
      {/* Full width on mobile, half on desktop */}
      <div className="
        grid
        grid-cols-1      // Mobile: 1 column
        md:grid-cols-2   // Medium+: 2 columns
        gap-4
      ">
        <div>
          <label>Name</label>
          <input className="w-full" />
        </div>
        <div>
          <label>Type</label>
          <select className="w-full" />
        </div>
      </div>

      {/* Full width textarea */}
      <div>
        <label>Description</label>
        <textarea
          className="w-full"
          rows={4}
        />
      </div>

      {/* Buttons: stack on mobile, row on desktop */}
      <div className="
        flex
        flex-col         // Mobile: stack
        sm:flex-row      // Small+: horizontal
        gap-2
        sm:justify-end
      ">
        <button className="w-full sm:w-auto">Cancel</button>
        <button className="w-full sm:w-auto">Save</button>
      </div>
    </form>
  )
}
```

---

## Best Practices

### Touch Targets

```typescript
// ✅ DO - Ensure minimum 44x44px touch targets on mobile
<button className="
  p-3              // 48px minimum (with content)
  min-w-[44px]
  min-h-[44px]
">
  Icon
</button>

// ❌ DON'T - Too small for touch
<button className="p-1">
  Icon
</button>
```

### Text Readability

```typescript
// ✅ DO - Limit line length for readability
<p className="
  max-w-full       // Mobile: full width
  md:max-w-prose   // Medium+: ~65ch optimal reading width
">
  Long paragraph text...
</p>

// ✅ DO - Appropriate font sizes
<p className="
  text-sm          // Mobile: 14px
  lg:text-base     // Large+: 16px
">
```

### Performance

```typescript
// ✅ DO - Use CSS for responsive behavior (not JS)
<div className="hidden lg:block">
  Desktop Only
</div>

// ❌ DON'T - Use JS window.innerWidth checks
const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
// Causes hydration issues, performance problems
```

---

## Testing Checklist

- [ ] Test on 320px (small mobile)
- [ ] Test on 375px (standard mobile)
- [ ] Test on 768px (tablet)
- [ ] Test on 1024px (laptop)
- [ ] Test on 1920px (desktop)
- [ ] Verify touch targets on mobile (44x44px min)
- [ ] Check text readability at all sizes
- [ ] Verify navigation works on mobile
- [ ] Test forms on mobile devices
- [ ] Verify no horizontal scroll

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Horizontal scroll on mobile | Use `max-w-full` and `overflow-hidden` |
| Touch targets too small | Use `min-w-[44px] min-h-[44px]` |
| Text too small on mobile | Start with `text-sm` or `text-base` |
| Fixed widths break layout | Use responsive widths (`w-full md:w-1/2`) |
| Content hidden on mobile | Use `hidden lg:block` appropriately |
| Not testing on real devices | Always test on actual mobile devices |

---

**Related Guides**:
- [Styling Guide](./styling-guide.md) - Tailwind patterns
- [Component Patterns](../components/component-patterns.md) - Component structure
- [Theme Management](./theme-management.md) - Theme colors

**Last Updated**: 2026-02-03
