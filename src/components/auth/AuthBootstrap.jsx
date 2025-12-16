// src/components/auth/AuthBootstrap.jsx
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { useGetMyProfileQuery } from '../../features/auth/usersApiSlice'
import { setCredentials, setInitialized } from '../../features/auth/authSlice'

export default function AuthBootstrap({ children }) {
  const dispatch = useDispatch()
  const { isInitialized, userInfo } = useSelector((state) => state.auth)

  // Run the "me" request only until we initialize once
  const shouldFetch = !isInitialized && !userInfo

  const { data, isSuccess, isError, isFetching } = useGetMyProfileQuery(undefined, {
    skip: !shouldFetch,
  })

  useEffect(() => {
    // If we already initialized, nothing to do
    if (isInitialized) return

    // If profile fetched successfully, store it
    if (isSuccess && data?.data) {
      dispatch(setCredentials(data.data))
      dispatch(setInitialized())
      return
    }

    // If request failed (e.g., 401), mark initialized anyway
    if (isError) {
      dispatch(setInitialized())
    }

    // If we skipped fetch (e.g., already had userInfo), mark initialized
    if (!shouldFetch && !isFetching) {
      dispatch(setInitialized())
    }
  }, [dispatch, isInitialized, isSuccess, isError, data, shouldFetch, isFetching])

  return children
}
