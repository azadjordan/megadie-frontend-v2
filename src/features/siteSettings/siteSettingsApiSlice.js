import { apiSlice } from "../../app/apiSlice";

export const NOTICE_MESSAGE = "We’re carrying out temporary maintenance. Please contact us to confirm stock availability during this time.";
export const NOTICE_MESSAGE_MAX_LENGTH = 500;
export const noticeQueryOptions = {
  pollingInterval: 30000,
  skipPollingIfUnfocused: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  refetchOnMountOrArgChange: true,
};

const siteSettingsApi = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getMaintenanceNotice: builder.query({
      query: () => ({ url: "/site-settings/maintenance-notice", timeout: 8000 }),
      transformResponse: response => response.data,
      providesTags: ["MaintenanceNotice"],
    }),
    getAdminMaintenanceNotice: builder.query({
      query: () => ({ url: "/site-settings/maintenance-notice/admin", timeout: 8000 }),
      transformResponse: response => response.data,
      providesTags: ["MaintenanceNotice"],
    }),
    setMaintenanceNotice: builder.mutation({
      query: changes => ({ url: "/site-settings/maintenance-notice", method: "PUT", body: changes, timeout: 8000 }),
      transformResponse: response => response.data,
      async onQueryStarted(_changes, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(apiSlice.util.updateQueryData("getAdminMaintenanceNotice", undefined, () => data));
        } catch { /* Preserve the draft and refetch after an ambiguous failure. */ }
      },
      // Refetch even after an ambiguous timeout: the server may have saved it.
      invalidatesTags: ["MaintenanceNotice"],
    }),
  }),
});

export const { useGetMaintenanceNoticeQuery, useGetAdminMaintenanceNoticeQuery, useSetMaintenanceNoticeMutation } = siteSettingsApi;
