import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { apiSlice } from './apiSlice'
import authReducer from '../features/auth/authSlice'
import cartReducer from '../features/cart/cartSlice'
import { publishSessionEvent } from '../utils/adminSessionSync'

const sessionBroadcast = (api) => (next) => (action) => {
  const before = api.getState().auth.userInfo
  const result = next(action)
  const after = api.getState().auth.userInfo
  if (action.type === 'auth/setCredentials' && action.meta?.source === 'login' && after?.sessionId) {
    publishSessionEvent({ type: 'login', sessionId: after.sessionId })
  } else if (action.type === 'auth/logout' && before?.sessionId && !after && !action.payload?.remote) {
    publishSessionEvent({ type: action.payload?.reason === 'expired' ? 'expired' : 'logout', sessionId: before.sessionId })
  }
  return result
}

const CART_STORAGE_KEY = 'megadie.cart.v1'
const isBrowser = typeof window !== 'undefined'

const loadCartState = () => {
  if (!isBrowser) return undefined
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.items)) return undefined

    const items = parsed.items
      .map((item) => ({
        productId: item?.productId,
        product: item?.product ?? null,
        quantity: Number(item?.quantity) || 1,
      }))
      .filter((item) => item.productId)

    return { items }
  } catch {
    return undefined
  }
}

const saveCartState = (cartState) => {
  if (!isBrowser) return
  try {
    const payload = JSON.stringify({ items: cartState.items || [] })
    window.localStorage.setItem(CART_STORAGE_KEY, payload)
  } catch {
    // Ignore storage failures (private mode / quota / disabled).
  }
}

const preloadedCart = loadCartState()
const preloadedState = preloadedCart ? { cart: preloadedCart } : undefined

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  preloadedState,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sessionBroadcast, apiSlice.middleware),
})

if (isBrowser) {
  setupListeners(store.dispatch)
  let lastItemsRef = store.getState().cart.items
  let saveTimer

  store.subscribe(() => {
    const { items } = store.getState().cart
    if (items === lastItemsRef) return
    lastItemsRef = items

    if (saveTimer) window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      saveCartState({ items })
    }, 200)
  })
}
