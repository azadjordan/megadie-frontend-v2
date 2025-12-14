import { configureStore } from '@reduxjs/toolkit'
import { apiSlice } from './apiSlice'
import authReducer from '../features/auth/authSlice'
import cartReducer from '../features/cart/cartSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
})
