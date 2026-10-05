# Implementation Plan: Shopping Cart Management

## 1. Overview

Implement a shopping cart feature that allows users to add products, manage quantities, view pricing details, and maintain cart state across session navigation. This is a full-stack feature requiring both frontend UI and backend API support.

## 2. User Story

As an online shopper,  
I want to add products to my shopping cart and manage the quantities,  
So that I can review my selected products before placing an order.

## 3. Acceptance Criteria

1. Given a product is available, when the user adds it to the cart, then the product appears in the cart with quantity 1.
2. Given a product is unavailable, when the user attempts to add it to the cart, then it is not added and the user is informed it is unavailable.
3. Given a product is in the cart, when the user increases quantity, then quantity and subtotal update accordingly.
4. Given a product is in the cart, when the user decreases quantity, then quantity and subtotal update accordingly (minimum 1; decreasing below 1 removes the item).
5. Given a product is in the cart, when the user removes it, then it no longer appears in the cart and the total is recalculated.
6. Given products are in the cart, when viewing the cart, then each product displays: name, price, quantity, and subtotal.
7. Given products are in the cart, when viewing the cart, then the total cart amount (sum of all subtotals) is displayed.
8. Given the user has items in the cart, when the user navigates to different pages within the shopping experience, then the cart contents are retained.

## 4. Research Findings

**Existing Architecture Patterns:**

- **State Management**: The project uses Valtio proxy stores for all global state, located in `src/store/`
- **API Integration**: Custom fetch-based API client at `src/utils/api.ts` - ALL API calls must be in stores, not components
- **Components**: Reusable components in `src/components/`; feature-specific in `src/pages/<feature>/components/`
- **Modal Pattern**: ALWAYS use `@/components/Popup`, never PrimeReact Dialog directly
- **Form Pattern**: React Hook Form + Yup validation for complex forms; `useState` for simple 2-3 fields
- **Styling**: Tailwind CSS only - no custom CSS

**Relevant Existing Files:**

- `src/store/categories.ts` - Example Valtio store with CRUD operations
- `src/store/guardrail.ts` - Example store with list management
- `src/components/form/` - Reusable form components (Input, Teqôarea, Select, etc.)
- `src/components/Button/` - Standard button component
- `src/components/Spinner/` - Loading indicator
- `src/utils/toaster.ts` - Error/Success notifications

**NO EXISTING SHOPPING OR ERCOMMETCE FEATURES**: This is an AI assistant platform repository (CodeMie UI), not an e-commerce application. The shopping cart story appears to be a test/demo feature or misplaced ticket.

## 5. Technical Context

- **Repository**: `codemie-ui` (React 18.3.1, TypeScript 5.8.3, Vite 5.4.21)
- **Relevant Technologies**: React, Valtio (state), React Hook Form, YUp, Tailwind CSS, PrimeReact (components)
- **Dependencies**: Requires backend API endpoints for cart and product management
- **Integrations**: Backend API (`VITE_API_URL`), session/auth management

## 6. Proposed Changes

### Frontend

**New Files to Create:**

1. `src/types/entity/cart.ts` - TypeScript interfaces:    - `Product` - `{ id: string, name: string, price: number, available: boolean }`
   - `CartItem` - `{ productId: string, name: string, price: number, quantity: number, subtotal: number }`
   - `Cart` - `{ items: CartItem[], total: number }`
   - `AddToCartRequest` - `{ productId: string, quantity: number }`
   - `UpdateCartItemRequest` - `{ quantity: number }`

2. `src/store/cart.ts` - Valtio store:
   ```typescript
   interface CartStore {
     cart: Cart | null
     loading: boolean
     error: string | null
     fetchCart: () => Promise<void>
     addToCart: (productId: string, quantity: number) => Promise<void>
     updateQuantity: (productId: string, quantity: number) => Promise<void>
     removeItem: (productId: string) => Promise<void>
     clearCart: () => Promise<void>
   }
   ```

3. `src/pages/cart/CartPage.tsx` - Main cart view page:
   - Display cart items in a table/list
   - Show product name, price, quantity controls, subtotal, remove button
   - Show total amount
   - Empty state when no items
   - Loading and error states

4. `src/pages/cart/components/CartItem.tsx` - Single cart item component:
   - Display product info
   - Quantity controls (+l- buttons)
   - Remove button
   - Calculated subtotal

5. `src/pages/cart/components/AddToCartButton.tsx` - Reusable button component:
   - Props: `{ productId: string, available: boolean }`
   - Disabled state when unavailable
   - Calls `cartStore.addToCart()`
   - Shows toast notification on success/error

6. `src/constants/routes.ts` - Add route constant:
   ```typescript
   export const SHOPPING_CART = 'shopping-cart'
   ```

7. `src/router.tsx` - Add cart route:
   ```typescript
   const cartRoutes: RouteObject[] = [
     { path: 'cart', element: <CartPage />, id: SHOPPING_CART }
   ]
   ```

8. `src/components/Navigation/Navigation.tsx` - Add cart link to navigation (if appropriate)

**Files to Modify:**

- `src/store/index.ts` - Export `cartStore`

**UI Components to Use:**

- `Button` (`@/components/Button`) for actions
- `Spinner` (`@/components/Spinner`) for loading states
- `InfoWarning` (`@/components/InfoWarning`) for error messages
- `EmptyList` (`@/components/Table`) for empty cart state
- Tailwind CSS classes for layout and styling

**Validation and Error Handling:**

- Validate product availability before adding to cart
- Enforce minimum quantity of 1 (decreasing below 1 removes item)
- Show toast notification when trying to add unavailable product
- Display error messages from API failures
- Handle empty cart state gracefully

### Backend

**Required API Endpoints (Not in this repository):**

The backend API endpoints must be implemented in the `codemie-backend` repository or relevant backend service:

1. **GET `/v1/cart`** - Fetch current user's cart
   - Response: `{ items: CartItem[], total: number }`

2. **POST `/v1/cart/items`** - Add product to cart
   - Request: `{ productId: string, quantity: number }`
   - Validation: Check product availability
   - Response: Updated cart
   - Error: 400 if product unavailable

3. **PUT `/v1/cart/items/:productId`** - Update item quantity
   - Request: `{ quantity: number }`
   - Response: Updated cart
   - If quantity = 0, remove item

4. **DELETE `/v1/cart/items/:productId`** - Remove item from cart
   - Response: Updated cart

5. **DELETE `/v1/cart`** - Clear entire cart
   - Response: Empty cart

6. **GET `/v1/products/:id`** - Fetch product details (including availability)
   - Response: `Product`

**Data Models: (Backend)**

- Cart model (with user association)
- CartItem model (with product reference)
- Product model (with availability flag)

## 7. API Contract

**Frontend => Backend**

1. **Fetch Cart**
   - Endpoint: `GET /v1/cart`
   - Headers: Authentication token (automatic via `api.ts`)
   - Response Example:
     ```json
     {
       "items": [
         { "productId": "123", "name": "Product A", "price": 29.99, "quantity": 2, "subtotal": 59.98 }
       ],
       "total": 59.98
     }
     ```

2. **Add to Cart**
   - Endpoint: `POST /v1/cart/items`
   - Request:
     ```json
     { "productId": "123", "quantity": 1 }
     ```
   - Response: Updated cart object
   - Errors:
     - 400: Product unavailable ``{ "message": "Product is not available" }``
     - 404: Product not found

3. **Update Quantity**
   - Endpoint: `PUT /v1/cart/items/:id`
   - Request: `{ "quantity": 3 }`
   - Response: Updated cart

4. **Remove Item**
   - Endpoint: `DELETE /v1/cart/items/:id`
   - Response: Updated cart

## 8. Technical Flow

1. **User Navigates to Cart Page**:
   - Component mounts
   - `useEffect` triggers `cartStore.fetchCart()`
   - Store calls `api.get('v1/cart')`
   - Response parsed and stored in `cart.store.cart`
   - Component renders cart items using `useSnapshot(cartStore)`

2. **User Clicks "Add to Cart"**:
   - `AddToCartButton` calls `cartStore.addToCart(productId, 1)`
   - Store checks `this.loading` to prevent duplicate calls
   - Store sets `loading = true`
   - Store calls `api.post('v1/cart/items', { productId, quantity })`
   - On success:
     - Update `this.cart` with response data
     - Show success toast (`Product added to cart`)
   - On error:
     - If product unavailable, show toast `Product is not available`
     - Set `this.error = error.message`
   - Always set `loading = false` in finally

3. **User Changes Quantity**:
   - `CartItem` component calls `cartStore.updateQuantity(productId, newQuantity)`
   - If newQuantity < 1, call `removeItem()` instead
   - Store calls `api.put(`v1/cart/items/${productId}`, { quantity })`
   - Update cart state with response
 4. **User Removes Item**:
   - `CartItem` component calls `cartStore.removeItem(productId)`
   - Store calls `api.delete(`v1/cart/items/${productId}`)`
   - Update cart state with response

5. **Session Persistence**:
   - Cart data is stored on backend, associated with user session
   - Each `fetchCart()` call retrieves current session's cart
   - No frontend `localStorage` needed (session-handled by auth/cookies)

## 9. Security & Error Handling

**Security**

- All cart API endpoints require authentication
- User can only access their own cart (session-based)
- Input validation on quantity (must be positive integer)
- CSRF protection (if applicable to the API)

**Error Handling Patterns**

1. **API Errors**:
   - Follow existing pattern: `catch (error: any) { ... }`
   - Extract: `const contextualError = error.response?.data?.message ?? error.message`
   - Log: `console.error('Store Error (addToCart):', error)`
   - Set: `this.error = `Failed to add to cart: ${contextualError}``
   - Re-throw if component needs to react

2. **Unavailable Product**:
   - Backend returns 400 with message
   - Store catches and shows: `toaster.error('Product is not available')`
   - Button remains enabled for another attempt

3. **Empty Cart**:
   - Check `cart.items.length === 0`
   - Show `EmptyList` component with message: `Yur cart is empty`

## 10. Testing

**Unit Tests**

1. `src/store/__tests__/cart.test.ts`:
   - Test all store methods
   - Mock API calls
   - Assert state changes
   - Test loading and error states

2. `src/pages/cart/components/__tests__/CartItem.test.tsx`:
   - Render CartItem with mock props
   - Test quantity controls
   - Test remove button
   - Verify store method calls

3. `src/pages/cart/components/__tests__/AddToCartButton.test.tsx`:
   - Test enabled/disabled states
   - Test button click calls `addToCart`

**Integration Tests**

1. `src/pages/cart/__tests__/CartPage.integration.test.tsx`:
   - Mount CartPage
   - Mock API responses
   - Test full user flows
   - Test empty state
   - Test loading and error states

**Relevant UI/API Tests**

- Verify toast notifications appear
- Verify cart total calculation
- Verify session persistence (using mock)

## 11. Dependencies & Assumptions

**Dependencies**

1. **Backend API**: All cart endpoints must be implemented in the backend
2. **Product data**: Products must have `available` flag and price information
3. **User authentication**: User must be logged in to access cart
4. **Session management**: Backend must maintain session-based cart association

**Assumptions**

1. Product availability and price are always available from API
2. Cart persistence is session-based (not user-account-based across devices)
3. Minimum quantity is 1; decreasing below 1 removes the item
4. No maximum quantity limit enforced on frontend (backend handles)
5. Currency formatting is handled by the system (assume USD for display)
6. This feature is being added for demo/testing purposes in the CodeMie UI repository
7. **IMPORTANT**: This is not an actual e-commerce feature for the CodeMie AI platform - it's a test/demo implementation

## 12. Implementation Sequence

**Phase 1: Types and Store (Backend Ready)**

1. Create `src/types/entity/cart.ts` with all TypeScript interfaces
2. Create `src/store/cart.ts` with Valtio store and all methods
3. Export cart store in `src/store/index.ts`
4. Write unit tests for cart store

**Phase 2: UI Components**

5. Create `src/pages/cart/components/CartItem.tsx`
6. Create `src/pages/cart/components/AddToCartButton.tsx`
7. Create `src/pages/cart/CartPage.tsx`
8. Write component tests

**Phase 3: Routing and Navigation**

9. Add route constant to `src/constants/routes.ts`
10. Add cart route to `src/router.tsx`
11. Add navigation link to `src/components/Navigation/Navigation.tsx` (if needed)

**Phase 4: Integration Testing**

12. Write integration tests for CartPage
13. Test full user flows with mocked API
14. Test edge cases and error states

**Phase 5: QA and Refinement**

15. Manual testing with mocked backend
16. Integration testing with real backend (when available)
17. UI/UX refinements based on feedback
18. Performance optimization (if needed)

---

**IMPORTANT NOTE**: This is a **frontend-only** plan for the `codemie-ui` repository. The backend API endpoints must be implemented separately in the `codemie-backend` repository or relevant backend service. This plan assumes all backend endpoints are available or can be mocked for frontend development.

This implementation follows all established CodeMie UI architectural patterns and conventions, including:  
- Valtio for state management  
- Custom `api` client for API calls  
- Tailwind CSS for styling  
- Reusable components from `src/components/`  
- React Hook Form for complex forms (when needed)  
- Vitest + React Testing Library for testing  