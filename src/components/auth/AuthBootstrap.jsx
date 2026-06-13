// src/components/auth/AuthBootstrap.jsx
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { useGetMyProfileQuery } from '../../features/auth/usersApiSlice'
import {
  setCredentials,
  setInitialized,
  setSessionCheckFailed,
} from '../../features/auth/authSlice'

const getSessionCheckError = (error) => {
  const status = error?.status || 'UNKNOWN_ERROR'

  if (status === 'TIMEOUT_ERROR') {
    return {
      status,
      message: 'The session check took too long.',
    }
  }

  if (status === 'FETCH_ERROR') {
    return {
      status,
      message: 'The session check could not reach the server.',
    }
  }

  return {
    status,
    message:
      error?.data?.message ||
      error?.error ||
      "We couldn't confirm your session.",
  }
}

export default function AuthBootstrap({ children }) {
  const dispatch = useDispatch()
  const { isInitialized, userInfo, sessionCheckNonce } = useSelector(
    (state) => state.auth,
  )

  // Run the "me" request only until we initialize once
  const shouldFetch = !isInitialized && !userInfo

  const { data, isSuccess, isError, isFetching, error } = useGetMyProfileQuery(
    sessionCheckNonce,
    {
      skip: !shouldFetch,
      refetchOnMountOrArgChange: true,
    },
  )

  useEffect(() => {
    // If we already initialized, nothing to do
    if (isInitialized) return

    // If profile fetched successfully, store it
    if (isSuccess && data?.data) {
      dispatch(setCredentials(data.data))
      return
    }

    // 401 means "guest"; timeout/network/server failures need a retry path.
    if (isError) {
      if (error?.status === 401) {
        dispatch(setInitialized())
        return
      }

      dispatch(setSessionCheckFailed(getSessionCheckError(error)))
      return
    }

    // If we skipped fetch (e.g., already had userInfo), mark initialized
    if (!shouldFetch && !isFetching) {
      dispatch(setInitialized())
    }
  }, [
    dispatch,
    isInitialized,
    isSuccess,
    isError,
    data,
    shouldFetch,
    isFetching,
    error,
  ])

  return children
}
