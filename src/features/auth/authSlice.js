// src/features/auth/authSlice.js
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  userInfo: null,        // { _id, name, email, isAdmin, ... }
  isInitialized: false,  // tells UI we’ve checked session at least once
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.userInfo = action.payload
    },
    logout: (state) => {
      state.userInfo = null
      state.isInitialized = true
    },
    setInitialized: (state) => {
      state.isInitialized = true
    },
  },
})

export const { setCredentials, logout, setInitialized } = authSlice.actions
export default authSlice.reducer
