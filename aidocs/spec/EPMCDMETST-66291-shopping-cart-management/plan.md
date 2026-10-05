# Implementation Plan: Shopping Cart Management

## 1. Overview

Implement a shopping cart feature that allows online shoppers to add products, manage quantities, remove items, and view pricing details. The cart state must persist during the user's shopping session.

---

## 2. User Story

**As an** online shopper,
**I want to** add products to my shopping cart and manage the quantities,
**So that** I can review my selected products before placing an order.

---

## 3. Acceptance Criteria

1. **Add to Cart**: Given an available product, when the user clicks "Add to Cart", then the product is added to the cart with quantity 1

2. **Unavailable Product Validation**: Given an unavailable product, when the user attempts to add it to the cart, then the product is not added and the user is notified

3. **Increase Quantity**: Given a product is in the cart, when the user increases the quantity, then the quantity updates and the subtotal recalculates accordingly

4. **Decrease Quantity**: Given a product is in the cart, when the user decreases the quantity, then the quantity updates and the subtotal recalculates accordingly

5. **Remove Product**: Given a product is in the cart, when the user removes the product, then the product is removed from the cart and the total amount updates

6. **Cart Display Information**: Given products are in the cart, when viewing the cart, then the user sees product name, price, quantity, and subtotal for each item

7. **Total Cart Amount**: Given products are in the cart, when viewing the cart, then the user sees the total cart amount calculated as the sum of all subtotals

8. **Cart Persistence**: Given the user has items in the cart, when the user navigates to other pages in the shopping experience, then the cart contents are retained

---

## 4. Research Findings

### Relevant Patterns from Codebase

Based on the existing `codemie-ui` codebase, the following patterns and components are relevant:

**State Management Pattern (Valtio)*:
- The project uses Valtio for state management with `proxy` objects
- Components use `useSnapshot()` to read state reactively
- All API calls must be in store methods, never in components
- Store files located in `src/store/`
- Example: `src/store/providers.ts`, `src/store/user.ts`

**Session Persistence Pattern**:
- `src/utils/storage.ts` provides `put`, `get`, `getObject`, `remove` for localStorage
- `src/hooks/useSearchParams.ts` uses sessionStorage for filter persistence
- Chat configuration persistence in `src/pages/chat/hooks/useChatConfiguration.tsx`
- Key format: `${userId}_${key}`

**API Integration Pattern**:
- Use `import api from '@/utils/api'`
- Always call `await response.json()` to parse responses
- API calls only in Valtio store methods, never in components
- Error handling: `try/catch/finally` with `this.loading` and `this.error`

```javascript
// Example store pattern from codebase
async indexProviders() {
  this.loading = true
  const response = await api.get('v1/providers')
  const data = await response.json()
  this.providers = data
  this.loading = false
  return data
}
```

**Form Validation Pattern**:
- React Hook Form + Yup for form validation
- Schemas in separate `formSchema.ts` files
- Use `yup.InferType<typeof schema>` for TypeScript types
- `yupResolver(schema)` passed to `useForm`

**Error Handling**:
- Toaster notifications: `import toaster from '@/utils/toaster'`
- Use `toaster.error()`, `toaster.info()`, `toaster.success()`
- API wrapper shows toasters automatically on errors

**Testing Pattern**:
- Vitest + React Testing Library
- Colocated tests in `__tests__/` directories
- `afterEach(cleanup)` for rendered components
- `vi.mock()` for module mocks
- `mockAPI` for HTTP intercepts in integration tests

---

## 5. Technical Context

-**Repository**: `codemie-ui` (Frontend)
-**Technology Stack**:
  - React 18
  - TypeScript
  - Valtio (state management)
  - React Router v7
  - Tailwind CSS
  - Vitest + React Testing Library
-**Dependencies**: Product catalog API for product availability and pricing
-**Integration**: Backend API endpoints for products and cart management

---

## 6. Proposed Changes

### Frontend

#### State Management (Valtio Store)

**File**: `src/store/shoppingCart.ts` (new)

**Purpose**: Manage shopping cart state and persistence

**State Structure**:
```typescript
interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  available: boolean
}

interface ShoppingCartStore {
  items: CartItem[]
  loading: boolean
  error: string | null
  total: number  // derived getter
  
  // Actions
  addToCart: (productId: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number) => void
  increaseQuantity: (productId: string) => void
  decreaseQuantity: (productId: string) => void
  removeFromCart: (productId: string) => void
  loadCart: () => void
  saveCart: () => void
  clearCart: () => void
}
```

**Key Features**:
- Use a `total` getter to automatically calculate total cart amount
- Persist cart items to `localStorage` on every change
- Load cart from `localStorage` on initialization
- Validate product availability when adding to cart
- Auto-save on every state mutation

---

#### Components

**1. Shopping Cart Page**

**File**: `src/pages/shopping/ShoppingCartPage.tsx` (new)

**Purpose**: Main cart view page

**Responsibilities**:
- Display the list of cart items
- Show total cart amount
- Provide empty cart state
- Integrate `CartItem` components
- Display loading and error states

**UI Structure**:
```jsx
<div className="container">
  <h1>Shopping Cart</h1>
  
  {items.length === 0 ? (
    <EmptyCart />
  ) : (
    <>
      <CartItemList items={items} />
      <CartSummary total={total} />
    </>
  )}
</div>
```

---

**2. Cart Item Component**

**File**: `src/pages/shopping/components/CartItem.tsx` (new)

**Purpose**: Display a single cart item with actions

**Features**:
- Display product name, price, quantity, subtotal
- Quantity controls (+/- buttons)
- Remove button
- Auto-calculated subtotal (price × quantity)

**Props**:
```typescript
interface CartItemProps {
  item: CartItem
  onIncrease: (productId: string) => void
  onDecrease: (productId: string) => void
  onRemove: (productId: string) => void
}
```

**UI Layout**:
```jsx
<div className="cart-item">
  <div className="item-info">
    <h3>{item.name}</h3>
    <p className="price">${item.price}</p>
  </div>
  
  <div className="quantity-controls">
    <button onClick={() => onDecrease(item.productId)}>-</button>
    <span>{item.quantity}</span>
    <button onClick={() => onIncrease(item.productId)}>+</button>
  </div>
  
  <div className="subtotal">
    <p>Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
  </div>
  
  <button onClick={() => onRemove(item.productId)}>Remove</button>
</div>
```

---

**3. Cart Summary Component**

**File**: `src/pages/shopping/components/CartSummary.tsx` (new)

**Purpose**: Display total cart amount and checkout button

**Features**:
- Display formatted total amount
- Placeholder for future checkout flow

**UI**:
```jsx
<div className="cart-summary">
  <h1>Total: ${total.toFixed(2)}</h1>
  <button>Proceed to Checkout</button>
</div>
```

---

**4. Product Listing Integration**

**File**: `src/pages/products/ProductListPage.tsx` (modify if exists or create new)

**Purpose**: Product listing with "Add to Cart" buttons

**Integration**:
- Import `shoppingCartStore`
- Add "Add to Cart" buttons to product cards
- Call `shoppingCartStore.addToCart(productId)`
- Disable button for unavailable products
- Show error toastif adding unavailable product

---

#### Types

**File**: `src/types/entity/shoppingCart.ts` (new)

*`CartItem` interface
* `ShoppingCartStore` interface

**File**: `src/types/entity/product.ts` (new or modify)

* `Product` interface (if not exists)
* Include: `id`, `name`, `price`, `available`, description, imageUrl

---

#### Utilities

**File**: `src/utils/cartStorage.ts` (new)

**Purpose**: Cart persistence helpers

*`saveCartToStorage(cartItems: CartItem[])`
* `loadCartFromStorage(): CartItem[]`
* `clearCartStorage()`

Use existing storage utility: `import storage from '@/utils/storage'`

---

#### Routing

**File**: `src/router.tsx` (modify)

Add routes:
```typescript
{
  path: '/cart',
  element: <ShoppingCartPage />,
},
{
  path: '/products',
  element: <ProductListPage />,
}
```

---

## 7. API Contract

**Note**: The following API endpoints are assumed based on the story requirements. These need to be verified with the backend team.

#### Get Product By ID

**Endpoint**: `GET /api/v1/products/{id}`

**Response**:
```json
{
  "id": "product-123",
  "name": "Product Name",
  "price": 19.99,
  "available": true,
  "description": "Product description",
  "imageUrl": "/images/product.jpg"
}
```

**Errors**:
- `404`: Product not found
- `400`: Invalid product ID

---

#### Get All Products

**Endpoint**: `GET /api/v1/products`

**Query Params**:
- `page`: number (default: 0)
- `per_page`: number (default: 12)
- `available`: boolean (filter)

**Response**:
```json
{
  "items": [
    {
      "id": "product-123",
      "name": "Product Name",
      "price": 19.99,
      "available": true
    }
  ],
  "total": 100
}
```

---

## 8. Technical Flow

1. **User Visits Product Listing Page**:
   - `ProductListPage` renders
   - `productStore.fetchProducts()` called
   - Product cards displayed with "Add to Cart" buttons

2. **User Clicks "Add to Cart"**:
   - `shoppingCartStore.addToCart(productId)` called
   - Store validates product availability
   - If available: add to `items` array with quantity = 1
   - If unavailable: show error toast
   - Auto-save to `localStorage`

3. **User Navigates to Cart Page**:
   - `ShoppingCartPage` renders
   - `useSnapshot(shoppingCartStore)` reads state
   - `CartItem` components rendered for each item
   - `CartSummary` displays total

4. **User Increases/Decreases Quantity**:
   - `shoppingCartStore.increaseQuantity(productId)` or `decreaseQuantity(productId)`
   - Store updates quantity
   - If quantity reaches 0, remove item from cart
   - `total` getter auto-recalculates
   - Auto-save to `localStorage`
   - UI re-renders via `useSnapshot`

5. **User Removes Item**:
   - `shoppingCartStore.removeFromCart(productId)`
   - Store filters item out of `items` array
   - `total` recalculates
   - Auto-save to `localStorage`
   - UI re-renders

6. **User Navigates Away and Returns**:
   - On app initialization, `shoppingCartStore.loadCart()` called
   - Cart items loaded from `localStorage`
   - State restored, cart persists across sessions

---

## 9. Security & Error Handling

#### Validation

- **Product Availability Check**: Before adding to cart, verify `product.available === true`
- **Quantity Validation**: Minimum quantity = 1; remove item if decreased below 1
- **Price Validation**: Ensure `price` is a positive number
- **Input Sanitization**: Sanitize product name and description to prevent XSS

#### Error Handling

- **Unavailable Product Error**: `Sorry, this product is currently unavailable`
- **API Error**: `Failed to load product. Please try again`
- **Storage Error**: Graceful fallback if `localStorage` is not available
- **Network Error**: Retry mechanism or user notification

#### Security

- **XSS Prevention**: Sanitize all user-generated content (even though product data comes from API)
- **Storage Security**: Never store sensitive data in `localStorage` (e.g., payment info)
- **Input Validation**: Validate all numeric inputs (quantity, price)

---

## 10. Testing

#### Unit Tests

**File**: `src/store/__tests__/shoppingCart.test.ts` (new)

**Test Cases**:
- [] addToCart() adds available product with quantity 1
- [] addToCart() rejects unavailable product
- [] increaseQuantity() increments quantity
- [] decreaseQuantity() decrements quantity
- [] decreaseQuantity() removes item when quantity reaches 0
- [] removeFromCart() removes item from cart
- [] `total` getter calculates correct sum of subtotals
- [] saveCart() persists cart to localStorage
- [] loadCart() restores cart from localStorage
- [] clearCart() empties the cart

---

**File**: `src/pages/shopping/components/__tests__/CartItem.test.tsx` (new)

**Test Cases**:
- [] Renders product name, price, quantity, and subtotal
- [] Calculates subtotal correctly (price × quantity)
- [] Increase button calls `onIncrease` with productId
- [] Decrease button calls `onDecrease` with productId
- [] Remove button calls `onRemove` with productId
- [] Accessibility: quantity controls have aria-labels

---

#### Integration Tests

**File**: `src/pages/shopping/__tests__/ShoppingCartPage.integration.test.tsx` (new)

**Test Cases**:
- [] Empty cart displays empty state message
- [] Adding a product displays it in the cart
- [] Increasing quantity updates displayed quantity and subtotal
- [] Decreasing quantity updates displayed quantity and subtotal
- [] Removing an item removes it from the cart
- [] Total amount updates correctly as items change
- [] Cart persists across page navigation (mock router)
- [] Cart loads from localStorage on page reload

---

#### E2E Tests (Optional)

- [] User can add multiple products to cart
- [] User can manage quantities
- [] User can remove products
- [] Cart persists across page refresh
- [] Unavailable products cannot be added

---

## 11. Dependencies & Assumptions

#### Dependencies

1. **Product Catalog API**: Must provide product availability status and pricing information
2. **Session Management**: User session must be persistent for cart to persist
3. **localStorage Availability**: Browser must support `localStorage`
4. **Price Formatting**: Assume USD currency; formatting handled frontend

#### Assumptions

1. **Minimum Quantity**: Minimum cart quantity is 1; decreasing from 1 removes the item
2. **No Maximum Quantity**: No upper limit on quantity (unless defined later)
3. **Session-Based Persistence**: Cart persists across browser sessions using `localStorage`, not backend storage
4. **No Authentication Required**: Cart functionality does not require user login (guest cart)
5. **Checkout Out of Scope**: This story focuses on cart management; checkout flow is a separate feature
6. **Single Currency**: All prices are in the same currency (USD assumed)
7. **No Promotions/Discounts**: Cart does not handle discount codes or promotions (yet)

---

## 12. Implementation Sequence

1. **Setup Types**: Create `CartItem`, `ShoppingCartStore`, and `Product` interfaces
2. **Create Storage Utilities**: Implement `cartStorage.ts` with save/load/helpers
3. **Create Shopping Cart Store**: Implement `shoppingCartStore` with all actions and `total` getter
4. **Write Store Unit Tests**: Validate store behavior
5. **Create CartItem Component**: Build and test `CartItem.tsx`
6. **Create CartSummary Component**: Build and test `CartSummary.tsx`
7. **Create ShoppingCartPage**: Assemble the main cart page
8. **Add Product Listing Integration**: Add "Add to Cart" buttons to product listing
9. **Update Router**: Add routes for cart and product pages
10. **Write Integration Tests**: End-to-end test coverage
11. **Add Accessibility**: Ensure ARIA labels, keyboard navigation, screen reader support
12. **Styling & Polish**: Tailwind CSS styling and UX refinements
13. **Manual Testing**: Full flow testing in dev environment
14. **Code Review**: Submit PR and address feedback

---

## Completion Criteria

- [] All acceptance criteria met
- [] Unit tests pass (>80% coverage)
- [] Integration tests pass
- [] TypeScript compilation passes with no errors
- [] Accessibility standards met (WCAG 2.1 Level AA)
- [] Code review approved
- [] Manual testing complete
- [] Cart persists across page navigation and browser refresh
- [] Error handling implemented for all edge cases
- [] Documentation updated (README, component docs)
