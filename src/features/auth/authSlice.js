import { createSlice } from '@reduxjs/toolkit'
import { getAdminSessionDeadline, getAdminAbsoluteDeadline } from '../../utils/adminSession.js'

const initialState = {
  userInfo: null,
  adminSessionDeadline: null,
  adminAbsoluteDeadline: null,
  sessionGeneration: 0,
  isInitialized: false,
  sessionCheckError: null,
  sessionCheckNonce: 0,
}

function clearSession(state) {
  state.userInfo = null
  state.adminSessionDeadline = null
  state.adminAbsoluteDeadline = null
  state.sessionGeneration += 1
}

function applyMetadata(state, metadata) {
  // Late responses cannot shorten a session or restart its absolute clock.
  if (state.userInfo?.sessionId !== metadata.sessionId) return
  if (metadata.sessionAbsoluteExpiresAt !== state.userInfo.sessionAbsoluteExpiresAt) return
  if (!Number.isFinite(metadata.sessionExpiresAt) || metadata.sessionExpiresAt < state.userInfo.sessionExpiresAt || metadata.sessionServerTime < state.userInfo.sessionServerTime) return
  const profile = { ...state.userInfo, ...metadata }
  state.adminAbsoluteDeadline = getAdminAbsoluteDeadline(profile)
  state.adminSessionDeadline = Math.min(getAdminSessionDeadline(profile), state.adminAbsoluteDeadline)
  Object.assign(state.userInfo, metadata)
}

const authSlice = createSlice({
  name: 'auth', initialState,
  reducers: {
    setCredentials: {
      prepare: (profile, source = 'login') => ({ payload: profile, meta: { source } }),
      reducer: (state, { payload: profile, meta }) => {
        const previous = state.userInfo
        if (meta.source === 'profile') {
          if (!previous || previous._id !== profile._id || previous.sessionId !== profile.sessionId) return
          const savedMetadata = Object.fromEntries(['sessionId', 'sessionExpiresAt', 'sessionServerTime', 'sessionAbsoluteExpiresAt'].map((key) => [key, previous[key]]))
          state.userInfo = { ...profile, ...savedMetadata }
          if (profile.isAdmin) applyMetadata(state, profile)
        } else {
          const sameSession = previous?._id === profile._id && previous?.sessionId === profile.sessionId
          if (!sameSession) state.sessionGeneration += 1
          state.userInfo = profile
          state.adminSessionDeadline = getAdminSessionDeadline(profile)
          state.adminAbsoluteDeadline = getAdminAbsoluteDeadline(profile)
        }
        state.isInitialized = true
        state.sessionCheckError = null
      },
    },
    updateAdminSession: (state, { payload }) => {
      if (state.userInfo?.isAdmin && state.userInfo.sessionId === payload.expectedSessionId) applyMetadata(state, payload.metadata)
    },
    logout: (state, { payload }) => {
      if (payload?.expectedSessionId && state.userInfo?.sessionId !== payload.expectedSessionId) return
      clearSession(state)
      state.isInitialized = true
      state.sessionCheckError = null
    },
    setInitialized: (state) => { state.isInitialized = true; state.sessionCheckError = null },
    setSessionCheckFailed: (state, { payload }) => {
      clearSession(state)
      state.isInitialized = true
      state.sessionCheckError = payload || { message: "We couldn't confirm your session.", status: 'UNKNOWN_ERROR' }
    },
    restartSessionCheck: (state) => {
      clearSession(state)
      state.isInitialized = false
      state.sessionCheckError = null
      state.sessionCheckNonce += 1
    },
  },
})

export const { setCredentials, updateAdminSession, logout, setInitialized, setSessionCheckFailed, restartSessionCheck } = authSlice.actions
export default authSlice.reducer
