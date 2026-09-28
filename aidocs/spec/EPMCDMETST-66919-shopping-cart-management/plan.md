# Implementation Plan: Shopping Cart Management (codemie-ui)

## Overview
This implementation plan covers the development of a full-featured shopping cart system for an e-commerce platform. This feature enables online shoppers to add available products to their cart, manage quantities, remove items, view pricing details, and persist cart state across navigation.

This is a standalone e-commerce feature implemented in the codemie-ui repository following established project patterns for state management (Valtio), component structure, and TypeScript typing.

---

## User Story
**As an** online shopper,  
**I want to** add products to my shopping cart and manage the quantities,  
**so that** I can review my selected products before placing an order.

---

### Acceptance Criteria

1. **AC-001**: Given an available product, when the user clicks “Add to Cart”, then the product is added to the cart with quantity = 1 and appears in the cart view.
2. **AC-002**: Given a product already in the cart, when the user increases the quantity, then the quantity increments by 1 and the subtotal updates accordingly.
3. **AC-003**: Given a product in the cart with quantity > 1, when the user decreases the quantity, then the quantity decrements by 1 and the subtotal updates accordingly.
4. **AC-004**: Given a product in the cart, when the user clicks “Remove”, then the product is removed from the cart and no longer appears in the cart view.
5. **AC-005**: Given products in the cart, when viewing the cart, then each product displays: name, unit price, quantity, and calculated subtotal.
6. **AC-006**: Given multiple products in the cart, when viewing the cart, then the total cart amount is displayed as the sum of all subtotals.
7. **AC-007**: Given an unavailable product, when the user attempts to add it to the cart, then the system prevents the addition and displays an appropriate message.
8. **AC-008**: Given items in the shopping cart, when the user navigates to different pages within the shopping platform, then the cart contents are retained and remain accessible.

---

### Assumptions

1. **Session-based persistence**: Cart data persists during the current browser session using `sessionStorage`. No cross-session or multi-device persistence is required.
2. **No backend integration**: This is a front-end-only implementation. All product data and cart state are managed client-side.
3. **Mock product catalog**: Products are defined as mock data in the store, including name, price, and availability status.
4. **No maximum quantity limit**: Unless specified, there is no upper limit on quantity per product.
5. **No stock validation**: The system does not validate whether sufficient inventory exists.
6. **No tax, shipping, or discounts**: These calculations are out of scope for this story.
7. **No checkout functionality**: The cart is a standalone feature; checkout and payment processing are not included.
8. **USD currency**: All pricing is displayed in US Dollars.

---

## Research Findings

### Existing Codebase Patterns

- **Similar Features**: No existing shopping cart or e-commerce features in the codemie-ui repository. This is a new feature built from scratch.
- **Reusable Components**: 
  - `Button` (from `@/components/Button`) for action buttons
  - `Spinner` (from `@/components/Spinner`) for loading states
  - `Card`, `list`, and typography components for UI layout
  - Established Tailwind CSS utility classes for styling
- **Established Patterns**: 
  - **Valtio* state management for stores (`.ai-run/guides/patterns/state-management.md`)
  - Session storage persistence found in `premiumModelTipStore` (uses session-scoped state)
  - React component patterns: functional components, TypeScript typing, `useSnapshot` for state reactivity
  - Component file organization: `src/pages/*` for page-level components, `src/components/*` for reusable components
  - Error handling with `toaster` utility (found in `MCPToolkitTest`)
  - Accessibility patterns: `aria-label`, `aria-live`, semantic HTML elements

---

### CodeMie User Guide References

- **Relevant Documentation**: None - this is a standalone e-commerce feature, not related to CodeMie's AI assistant platform functionality.
- will follow existing CodeMie UI patterns for consistency in styling, layout, and accessibility.

---

## Technical Context

- **Repository**: codemie-ui
- **Tech Stack**: 
  - React 18
  - TypeScript
  - Valtio (state management)
  - Tailwind CSS (styling)
  - Vitest (testing)
- **Dependencies**: None (front-end-only)
- **Integrations**: None (this is a standalone feature)

---

## Architecture & Design

### Component Overview

This implementation follows a page-based architecture with a centralized Valtio store:

```
src/
├── pages/
│   ├── shopping/
│   │   ├── ProductListPage.tsx       (Displays products, “Add to Cart” buttons)
│   │   ├── ShoppingCartPage.tsx       (Full cart view with quantity management)
│   │   └── components/
│   │       ├── ProductCard.tsx
│   │       ├── CartItem.tsx
│   │       ├── CartSummary.tsx
│   │       └── QuantityControl.tsx
│    └── ...—││
├── store/
│   ├── products.ts             (Product data & mock catalog)
│   └── shoppingCart.ts          (Cart state, add/remove/update, persistence)
│
├── types/
│   └── entity/
│       └── product.ts           (Product interface)
│       └── cartItem.ts          (CartItem interface)
│
├── utils/
│   └── sessionStorage.ts        (Session storage helpers)
│
└── routes/
    └── shopping.tsx            (Routes for ProductList & Cart)
```

---

### Data Model

**Product Interface**:
```typescript
interface Product {
  id: string
  name: string
  price: number         // in USD
  available: boolean     // AC-007: only available products can be added
  description?: string
  imageUrl?: string
}
```

**CartItem Interface**:
```typescript
interface CartItem {
  product: Product
  quantity: number       // min = 1 (AC-002/003)
  subtotal: number       // calculated: price * quantity (AC-005)
}
```

**ShoppingCart Store Shape**:
```typescript
interface ShoppingCartStore {
  items: CartItem[]                    // AC-001: products in cart
  total: number                        // AC-006: sum of all subtotals
  
  // Actions
  addToCart: (product: Product) => void         // AC-001, AC-007
  increaseQuantity: (productId: string) => void  // AC-002
  decreaseQuantity: (productId: string) => void  // AC-003
  removeFromCart: (productId: string) => void    // AC-004
  clearCart: () => void
  
  // Persistence (AC-008)
  loadCartFromSession: () => void
  saveCartToSession: () => void
}
```

---

### Security Considerations

- **Input Validation**: 
  - Quantity must be a positive integer (≥ 1)
  - Product IDs must be valid and exist in the product catalog
  - Only available products can be added (AC-007)
- **XSS Prevention**: Product names and descriptions rendered using React's default escaping
- **Session Storage Security**: Data stored in `sessionStorage` is domain-scoped and cleared on tab/window close
- **No sensitive data**: No payment info, PII, or authentication tokens stored

---

### Error Handling

- **Unavailable Product error* (AC-007): Display toast notification: “This product is currently unavailable”
- **Invalid Quantity error**: Prevent quantity from going below 1 (component validation)
- **Empty Cart State**: Display message: “Your cart is empty. Start shopping!”
- **Session Storage Failure**: If `sessionStorage` fails, fall back to in-memory state (only persists until page refresh)

---

## Implementation Phases

### Phase 0: Research & Discovery

- [x] Review Valtio state management patterns *`providers.ts`, `analytics.ts`* *completed during planning*
- [x] Analyze session storage usage found in **premiumModelTipStore** *completed during planning*
- [x] Review CodeMie UI component patterns *completed during planning*
- [x] Review accessibility patterns *completed during planning*

---

### Phase 1: Core Types & Store Setup

1 **Create Type Definitions**:
   - `src/types/entity/product.ts` with `Product` interface
   - `src/types/entity/cartItem.ts` with `CartItem` interface

2. **Create Product Store** (`src/store/products.ts`):
   - Define mock product data (5-10 products, including at least 1 unavailable)
   - Export `productsStore` with `products` array
   - Implement `getProductById(id: string)` helper

3. **Create Shopping Cart Store** (`src/store/shoppingCart.ts`):
   - Define `ShoppingCartStore` interface
   - Implement Valtio proxy with:
     - `items: CartItem[]`
     - `total: number` (computed getter)
     - `addToCart(product: Product)` (☠ AC-001, AC-007)
     - `increaseQuantity(productId: string)` (☠ AC-002)
     - `decreaseQuantity(productId: string)` (☠ AC-003)
     - `removeFromCart(productId: string)` (☠ AC-004)
     - `clearCart()`
     - `loadCartFromSession()` (☠ AC-008)
     - `saveCartToSession()` (☠ AC-008)

---

### Phase 2: Session Storage Integration

1. **Create Session Storage Utility** (`src/utils/sessionStorage.ts`):
   - `saveToSession<T>(key: string, data: T): void`
   - `loadFromSession<T>(key: string): T | null`
   - `clearSession(key: string): void`
   - Error handling for `sessionStorage` unavailability

2. **Integrate Persistence into Cart Store**:
   - Call `saveCartToSession()` after every cart modification
   - Call `loadCartFromSession()` on app initialization (☠ AC-008)
   - Use `CART_STATE_KEY` constant for session storage key

---

### Phase 3: Core Components

1. **QuantityControl Component** (`src/pages/shopping/components/QuantityControl.tsx`):
   - Props: `quantity: number, onIncrease: () => void, onDecrease: () => void`
   - Display: `−` button, quantity, `∑` button
   - Disable `2��` when quantity == 1 (☠ AC-003)
   - Accessibility: `aria-label` on buttons, `role="spinbutton"` on quantity display

2. **ProductCard Component** (`src/pages/shopping/components/ProductCard.tsx`):
   - Props: `product: Product, onAddToCart: (product: Product) => void`
   - Display: product name, price, description, image (if available)
   - “Add to Cart” button (=> `onAddToCart`)
   - Disable button if `product.available === false` (☠ AC-007)
   - Styling: Tailwind CSS, card-like layout

3. **CartItem Component** (`src/pages/shopping/components/CartItem.tsx`):
   - Props: `item: CartItem, onIncrease: () => void, onDecrease: () => void, onRemove: () => void`
   - Display: product name, unit price, `<QuantityControl />`, subtotal (☠ AC-005)
   - ₌Remove₋ button (=> `onRemove`)
   - Styling: Row-based layout, Tailwind CSS

4. **CartSummary Component** (`src/pages/shopping/components/CartSummary.tsx`):
   - Props: `total: number`
   - Display: **Total: $[...]** (☠ AC-006)
   - Styling: Bold font, larger text, border/box style

---

### Phase 4: Page-Level Integration

1. **ProductListPage** (`src/pages/shopping/ProductListPage.tsx`):
   - Use `useSnapshot(productsStore)` to get product list
   - Use `useSnapshot(shoppingCartStore)` to get cart state
   - Map over `products` and render `<ProductCard />` for each
   - Handle `onAddToCart` => `shoppingCartStore.addToCart(product)` (☠ AC-001)
   - Display cart icon with item count in header

2. **ShoppingCartPage** (`src/pages/shopping/ShoppingCartPage.tsx`):
   - Use `useSnapshot(shoppingCartStore)` to get `items` and `total`
   - If `items.length === 0`: display empty state message
   - Map over `items` and render `<CartItem />` for each (☠ AC-005)
   - Handle `onIncrease`, `onDecrease`, `onRemove` callbacks
   - Render `<CartSummary />` at bottom (☠ AC-006)

3. **Add Routing** (`src/routes/shopping.tsx`):
   - Route for `/shopping/products` => `<ProductListPage />`
   - Route for `/shopping/cart` => `<ShoppingCartPage />`
   - Integrate with main app router

---

### Phase 5: Testing & Documentation

1. **Unit Tests**:
   - `tests/store/shoppingCart.test.ts`
     - Test `addToCart` with available product (AC-001)
     - Test `addToCart` with unavailable product prevention (AC-007)
     - Test `increaseQuantity` (AC-002)
     - Test `decreaseQuantity` (AC-003)
     - Test `removeFromCart` (AC-004)
     - Test `total` computation (AC-006)
     - Test session storage persistence (AC-008)

2. **Component Tests**:
   - `tests/components/QuantityControl.test.tsx`: Test increase/decrease, disabled state
   - `tests/components/ProductCard.test.tsx`: Test availability blocking, button clicks
   - `tests/components/CartItem.test.tsx`: Test rendering, callbacks
   - `tests/components/CartSummary.test.tsx`: Test total display

3. **Integration Tests**:
   - `tests/pages/ProductListPage.test.tsx`
     - Test adding products to cart from product list
     - Test unavailable product blocking
   - `tests/pages/ShoppingCartPage.test.tsx`
     - Test empty cart state
     - Test quantity management flow
     - Test removing items
     - Test total calculation

  - `tests/integration/cartPersistence.test.tsx`:
     - Test cart persists across page navigation (AC-008)
     - Test cart restores from sessionStorage on app init

4. **Documentation**:
   - Add `README.md` in `src/pages/shopping/` describing feature structure
   - Comment complex logic in shoppingCart.store
   - JSDoc comments for public functions/components

---

## Expected Artifacts

- `plan.md` (this file)
- TypeScript interfaces: 
```typescript
src/types/entity/
└── product.ts
└── cartItem.ts
```
- Stores: 
```typescript
src/store/
└── products.ts
└── shoppingCart.ts
```
- Utilities: 
```typescript
src/utils/
└── sessionStorage.ts
```
- Components: 
```typescript
src/pages/shopping/
├── ProductListPage.tsx
├── ShoppingCartPage.tsx
└── components/
    ├── ProductCard.tsx
    ├── CartItem.tsx
    ├── CartSummary.tsx
    └── QuantityControl.tsx
```
- Routes:
```typescript
src/routes/
└── shopping.tsx
```
- Test coverage reports (Vitest)
- Documentation: `src/pages/shopping/README.md`

---

## Dependencies

- **Valtio**: Already installed and used in the project
- **React Router**: Already installed (for routing)
- **Tailwind CSS**: Already configured
- **Vitest**: Already configured (for testing)
- **Session Storage API**: Browser-builtin (`window.sessionStorage`)

---

## Notes

1. **Front-End Only**: This is entirely a client-side implementation. No backend APIs are involved.
2. **Demo Purpose**: A basic mock product catalog is sufficient. Focus on correct cart state management and persistence.
3. **Accessibility**: All components must follow WCAG 2.1 AA standards (semantic HTML, KBD nav, aria labels).
4. **Screen Sizes**: Ensure responsive design using Tailwind CSS (mobile, tablet, desktop).
5. **User-Friendly Errors**: All error messages should be clear, actionable, and visible to the user (toast notifications).
6. **State Sync**: All cart state modifications must immediately trigger `saveCartToSession()` to ensure persistence.
7. **No Maximum Quantity**: Unless explicitly required, do not implement a quantity cap.
