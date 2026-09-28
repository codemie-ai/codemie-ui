# Implementation Plan: Shopping Cart Management (codemie-ui)

## Overview

This plan outlines the implementation of a shopping cart feature for the CodeMie UI. The feature allows users to add products to a cart, manage quantities, view cart details, and persist cart contents across navigation within the same session.

This is a **front-end only** implementation using Valtio state management and sessionStorage for persistence. No backend API changes are required.

**Repository**: codemie-ui
**Branch**: `feature/EPMCDMETST-66906-shopping-cart-management`

**Important Note**: This is a generic e-commerce feature that appears unrelated to CodeMie's core functionality (AI/agent platform). This plan assumes it's an intentional new feature extension.

## User Story

**As an** online shopper,  
**I want to** add products to my shopping cart and manage the quantities,  
**so that** I can review my selected products before placing an order.

### Acceptance Criteria

1. **AC-01**: Given an available product, when the user clicks "Add to Cart", then the product is added to the cart with quantity 1.
2. **AC-02**: Given a product already in the cart, when the user increases the quantity, then the cart reflects the updated quantity and recalculated subtotal.
3. **AC-03**: Given a product in the cart with quantity > 1, when the user decreases the quantity, then the cart reflects the reduced quantity and recalculated subtotal.
4. **AC-04**: Given a product in the cart, when the user clicks "Remove", then the product is completely removed from the cart.
5. **AC-05**: Given products in the cart, when viewing the cart, then each product displays its name, unit price, quantity, and subtotal.
6. **AC-06**: Given multiple products in the cart, when viewing the cart, then the total cart amount is displayed as the sum of all subtotals.
7. **AC-07**: Given an unavailable product, when the user attempts to add it to the cart, then the system prevents the addition and displays an appropriate message.
8. **AC-08**: Given products in the cart, when the user navigates to different pages within the shopping experience, then the cart contents remain unchanged upon returning to the cart view.

### Assumptions

1. **A-01**: Product availability status is maintained and accessible in the system.
2. **A-02**: Product pricing information is current and available at the time of cart operations.
3. **A-03**: User session management is in place to support cart persistence.
4. **A-04**: There are no maximum quantity limits per product (beyond availability constraints).
5. **A-05**: Cart functionality is for a single user session (not shared across multiple users).
6. **A-06**: Currency and pricing display formats are handled by existing system conventions.
7. **A-07**: Tax, shipping, and discount calculations are out of scope for this user story.


## Research Findings

### Existing Codebase Patterns

From my research of the `codemie-ui` codebase, I identified the following patterns that will guide this implementation:

1. **State Management**: 
   - All global state is managed via Valtio `proxy` stores in `src/store/`
   - Components use `useSnapshot()` to read state reactively
   - Stores own business logic and state mutations
   - Examples: `src/store/assistants.ts`, `src/store/chats.ts`

2. **Persistence Patterns**:
   - `localStorage` used for non-sensitive app-level settings (`appInfoStore`)
   - `sessionStorage` is appropriate for temporary cart data
   - Persistence key pattern: `${userId}_${key name}` or `${key}-${userId}`

3. **Component Organization**:
   - Page components: `src/pages/<feature>/`
   - Shared components: `src/components/`
   - Feature-specific components: `src/pages/<feature>/components/`
   - 300-line hard cap per file
   - Complex logic extracted to `use<Name>.ts` custom hooks

No existing shopping cart or product management features were found in the codebase. This is an ENTIRELY NEW feature area.

### CodeMie User Guide References

No shopping cart-related documentation was found in the CodeMie User Guide, as this is a new e-commerce feature unrelated to CodeMie's core AI/agent platform.

### Platform Conventions to Follow

- **Styling**: Tailwind CSS classes exclusively using `cn()` helper
- **UI Components**: PrimeReact 10.9.x components (Button, InputNumber, Table, etc.)
- **Form Handling**: React Hook Form + Yup validation (if needed)
- **Error Handling**: Use `toaster.error()` for user-facing errors
- **Accessibility**: ARIA: labels, roles, keyboard navigation


## Technical Context

- **Repository**: codemie-ui
- **Tech Stack**: React 18.3.1, TypeScript 5.8.3, Valtio (state), Tailwind CSS, PrimeReact 10.9.x
- **Dependencies**: 
  - No external APIs required (standalone frontend feature)
  - SessionStorage for persistence
  - Product data (assumed to be provided by existing system)
- **Integrations**: 
  - None (standalone feature)
  - Can be integrated with existing product listing pages if needed


## Api Contracts (Not Required for Frontend-Only)

This implementation is **front-end only** using local state and sessionStorage. No API endpoints are required.

If backend integration is needed in the future, the following endpoints would be required:
- `GET /products` - fetch available products
- `GET /cart` - fetch current user's cart
- `POST /cart/items` - add product to cart
- `PUT /cart/items/:id` - update quantity
- `DELETE /cart/items/:id` - remove product


## Architecture & Design

### Component Overview

```
  +─── src/
  │   ├── store/
  │   │   └── cart.ts                    (NEW) - Valtio cart store
  │   ├── pages/
  │   │   └── cart/                     (NEW) - Cart feature folder
   │   │       ├── CartPage.tsx            (NEW) - Main cart page
  │   │       ├── components/             (NEW)
  │   │       │   ├── CartItem.tsx        (NEW) - Single cart item component
  │   │       │   ├── CartSummary.tsx      (NEW) - Cart total summary
  │   │       │   └── EmptyCart.tsx       (NEW) - Empty state component
  │   │       └── hooks/                (NEW)
  │   │           └── useCart.ts          (NEW) - Cart hook
  │   │   └── products/                  (NEW) - Product listing section
  │   │       ├── ProductListPage.tsx     (NEW) - Product listing
  │   │       └── components/            (NEW)
  │   │           ├── ProductCard.tsx    (NEW) - Product card (w/ Add to Cart)
  │   │           └── AddToCartButton.tsx (NEW) - Reusable button
  │   ├── components/
  │   │   └── Layout/
  │   │       ├── Header.tsx (MODIFIED) - Add cart icon w/ item count
   │   │       └── Navigation.tsx (MODIFIED) - Add cart link
  │   ├── types/
   │   │   └── entity/
   │   │       └── product.ts (NEW) - Product interface
   │   │       └── cart.ts (NEW) - Cart & CartItem interfaces
   │   └── utils/
  │       └── cartStorage.ts (NEW) - SessionStorage utilities
```

### Data Model

```typescript
// src/types/entity/product.ts
export interface Product {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  available: boolean
  createdAt: string
  updatedAt: string
}

// src/types/entity/cart.ts
export interface CartItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  subtotal: number  // Computed: unitPrice * quantity
  imageUrl?: string
  addedAt: string
}

export interface Cart {
  items: CartItem[]
  total: number  // Computed: sum of all subtotals
  itemCount: number  // Computed: sum of all quantities
  lastUpdated: string
}
```

### Security Considerations

- **Input Validation**: 
  - Quantity must be a positive integer (>= 1)
  - Product ID must be validated before adding to cart
  - Availability checks before allowing cart addition
- **XSS Prevention**: 
  - All user inputs sanitized (React's default escaping)
  - Product data rendered safely
- **Storage Security**: 
  - Only non-sensitive cart data stored in sessionStorage
  - No personal or payment information in cart

### Error Handling

- **Product Unavailable**: Show toast error message using `toaster.error()`
- **Quantity Invalid**: Show inline validation error
- **Storage Failure**: Graceful fallback to in-memory state only
- **Empty Cart State**: Show friendly empty state message


## Implementation Phases

### Phase 0: Research & Discovery

- [x] Review Valtio store patterns in codebase *(completed during planning)*
- [x] Analyze existing feature patterns *completed)*
- [x] Check CodeMie User Guide for related patterns *(completed)*
- [] Clarify product data source (are products mocked or integrated from existing API?)
- [] Confirm design specs (for shopping cart UI layout)

### Phase 1: Core State & Types

1. **Create Data Models†** (<1 hour)
   - `src/types/entity/product.ts` - Product interface
   - `src/types/entity/cart.ts` - Cart & CartItem interfaces

2. **Create Cart Store†** (2 hours)
   - `src/store/cart.ts`
      - Valtio proxy store with `Cart` state
      - Methods:
        - `addToCart(product: Product)` - Add product with quantity 1
        - `increaseQuantity(productId: string)` - Increment quantity
        - `decreaseQuantity(productId: string)` - Decrement or admove
        - `removeFromCart(productId: string)` - Remove item
        - `clearCart()` - Clear all items
        - gloadCartFromStorage()` - Restore from sessionStorage
        - `saveCartToStorage()` - Persist to sessionStorage
     - Computed properties:
       - `get total()` - Sum of all subtotals
       - `get itemCount()` - Sum of all quantities

3. **Create Storage Utilities†** (1 hour)
   - `src/utils/cartStorage.ts`
      - `saveCartToStorage(cart: Cart): void`
      - `loadCartFromStorage(): Cart | null`
      - `clearCartStorage(): void`
      - Use key: `codemie-shopping-cart`

### Phase 2: Cart Components

1. **Create Cart Page†** (3 hours)
   - `src/pages/cart/CartPage.tsx`
      - Use `useSnapshot(cartStore)`
      - Render cart items list
      - Show cart summary with total
      - Handle empty cart state
      - Responsive layout with Tailwind

2. **Create CartItem Component†** (2 hours)
   - `src/pages/cart/components/CartItem.tsx`
      - Display product name, image, price
      - Quantity controls with +/- buttons
      - Calculate and display subtotal
      - Remove button
      - Accessible controls with ARIA labels

3. **Create CartSummary Component†** (1 hour)
   - `src/pages/cart/components/CartSummary.tsx`
      - Display item count
      - Display total amount
      - Proceed to checkout button (placeholder)

4. **Create EmptyCart Component†** (1 hour)
   - `src/pages/cart/components/EmptyCart.tsx`
      - Friendly empty state message
      - "Continue Shopping" button linking to products page

5. **Create useCart Hook†** (1 hour)
   - `src/pages/cart/hooks/useCart.ts`
      - Wraps cartStore methods
      - Provides clean API for components
      - Handles error messages

### Phase 3: Product Components

1. **Create ProductListPage†** (3 hours)
   - `src/pages/products/ProductListPage.tsx`
      - Display list of products in grid layout
      - Mock product data (or integrate with API if available)
      - Responsive design

2. **Create ProductCard Component†** (2 hours)
   - `src/pages/products/components/ProductCard.tsx`
      - Display product information
      - Show availability status
      - Integrate AddToCartButton

3. **Create AddToCartButton Component†** (1 hour)
   - `src/pages/products/components/AddToCartButton.tsx`
      - Reusable button component
      - Handle availability checks
      - Show loading state
      - Call `cartStore.addToCart()`
      - Display error toast if product unavailable

### Phase 4: Navigation & Integration

1. **Update Navigation†** (1 hour)
   - Modify `src/components/Layout/Navigation.tsx`
      - Add link to CartPage
      - Add "cart" navigation item

2. **Update Header†** (1 hour)
   - Modify `src/components/Layout/Header.tsx`
      - Add cart icon with item count badge
      - Use `cartStore.itemCount` for badge value
      - Link to CartPage

3. **Add Routes†** (30 minutes)
   - Update `src/router.tsx`
      - Add `/cart` route
      - Add `/products` route
      - Export route constants in `src/constants/routes.ts`

### Phase 5: Persistence & Lifecycle

1. **Implement Storage Persistence†** (2 hours)
   - Add effect in `cartStore` to save on changes
   - Load cart from storage on app initialization
   - Integrate with `src/App.tsx` or main entry point

2. **Add Cleanup†** (1 hour)
   - Clear cart on logout if needed
   - Handle expired session scenarios

### Phase 6: Testing & Quality Assurance

1. **Unit Tests†** (4 hours)
   - `src/store/__tests__/cart.test.ts`
      - Test all cart store methods
      - Test computed properties (total, itemCount)
      - Test edge cases (empty cart, zero quantity)
   - `src/utils/__tests__/cartStorage.test.ts`
      - Test save/sload/clear operations
   - Component unit tests:
      - `src/pages/cart/__tests__/CartPage.test.tsx`
      - `src/pages/cart/components/__tests__/CartItem.test.tsx`
      - `src/pages/products/components/__tests__/AddToCartButton.test.tsx`

2. **Integration Tests†** (2 hours)
   - `src/pages/cart/__tests__/CartPage.integration.test.tsx`
      - Test full cart flow: add/update/remove
      - Test persistence across navigation
      - Test empty cart state

3. **Manual Testing Checklist** 
   - [ ] Add product to cart (AC-01)
   - [ ] Increase quantity (AC-02)
   - [ ] Decrease quantity (AC-03)
   - [ ] Remove item (AC-04)
   - [ ] View cart details (AC-05)
   - [ ] View cart total (AC-06)
   - [ ] Prevent adding unavailable product (AC-07)
   - [ ] Cart persists across navigation (AC-08)
   - [ ] Empty cart state displays correctly
   - [ ] Cart icon badge shows correct count
   - [ ] Responsive design works on mobile/tablet
   - [ ] Keyboard navigation works
   - [ ] Screen reader accessibility

### Phase 7: Documentation

1. **Internal Documentation†** (2 hours)
   - Add JSDoc comments to store methods
   - Document component props and usage
   - Update README with shopping cart feature details

2. **User Guide Update†** (1 hour)
   - Create shopping cart user guide page
   - Add screenshots/ilstrations
   - Document key features and usage


## Expected Artifacts

- `plan.md` (this file)
- 12 new TypeScript/TSX files (store, components, pages, types, utils)
- 2 modified files (header, navigation)
- 10+ test files (unit and integration)
- Updated router configuration
- Documentation updates


## Dependencies

1. **Dependency 1: Product Data Source†**
   - Description: Need to determine how product data is sourced (mock data vs. existing API)
   - Impact: Blocks ProductListPage implementation
   - Resolution: Clarify with stakeholders

2. **Dependency 2: Design Specifications†**
   - Description: UI design for cart and product pages
   - Impact: Influences component layout and styling
   - Resolution: Use existing CodeMie UI patterns and PrimeReact components styles

3. **Dependency 3: No Backend Changes Required†**
   - This is a front-end-only implementation
   - No blockers from backend team


## Notes

### Important Considerations

1. **Feature Context**: This is a generic e-commerce feature that appears unrelated to CodeMie's core purpose (AI/agent platform). Verification is needed from stakeholders about the business context for this feature.

2. **Product Data**: The story assumes products exist, but it's unclear if: 
   - Products are mocked data
   - Products come from an existing API
   - A new product management system needs to be built

3. **Checkout Flow**: The current story only covers cart management. Checkout/payment flows are out of scope.

4. **Session Persistence Only**: Current implementation uses sessionStorage, which means cart data is lost when the tab/window closes. If long-term persistence is needed, consider:
   - Use localStorage instead
   - Implement backend API for cart persistence

5. **Performance**: For large carts (100+ items), consider virtualization or  pagination.

6. **Accessibility Priority**: All components must follow WCAG 2.1 AA gmidelines for keyboard navigation and screen reader support.

7. **Technical Constraints**: 
   - Must follow existing Valtio state management patterns
   - 300-line limit per file (extract to hooks if needed)
   - Tailwind CSS only (no custom CSS)
   - PrimeReact components for UI elements

### Scope Limitations

This implementation is limited to:
- Basic cart management (add/update/remove)
- Session-persistence (not cross-device or long-term)
- No checkout or payment functionality
- No user account integration
- No order history
- No product search/filters
- No wishlist functionality
- No promotional codes/discounts

### Future Enhancements

Potential future improvements:
- Backend API integration for persistent carts
- User authentication and cart ownership
- Product inventory validation
- Order checkout and payment flow
- Saved carts and wishlists
- Recommendations based on cart contents
- Guest checkout functionality

---

**Generated**: 2026-09-28
**Author**: Minal Jadhav
**Status**: Ready for Review