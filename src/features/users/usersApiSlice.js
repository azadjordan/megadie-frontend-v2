import { apiSlice } from "../../app/apiSlice";

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsersAdmin: builder.query({
      query: ({ page = 1, search = "", role = "all", sort = "name" } = {}) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (search) params.set("search", search);
        if (role && role !== "all") params.set("role", role);
        if (sort && sort !== "newest") params.set("sort", sort);
        return `/users?${params.toString()}`;
      },
      providesTags: (result) => {
        const listTag = { type: "User", id: "LIST" };
        const rows = result?.data || result?.items || [];
        return [listTag, ...rows.map((u) => ({ type: "User", id: u._id }))];
      },
    }),

    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: "User", id }],
    }),

    updateUser: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: "User", id: "LIST" },
        { type: "User", id: arg?.id },
      ],
    }),
  }),
});

export const {
  useGetUsersAdminQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
} = usersApiSlice;
