// src/pages/Auth/LoginPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useLoginMutation } from "../../features/auth/usersApiSlice";
import { setCredentials } from "../../features/auth/authSlice";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { userInfo, isInitialized } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [login, { isLoading }] = useLoginMutation();

  const fromPath = useMemo(() => {
    const from = location.state?.from;
    return from?.pathname || location.state?.fromPathname || null;
  }, [location.state]);

  // ✅ Context banner message based on where the user came from
  const contextMessage = useMemo(() => {
    if (!fromPath) return null;
    if (fromPath.startsWith("/cart"))
      return "Please sign in to submit your request.";
    if (fromPath.startsWith("/account"))
      return "Please sign in to access your account.";
    return "Please sign in to continue.";
  }, [fromPath]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!userInfo) return;

    if (fromPath) return navigate(fromPath, { replace: true });
    if (userInfo?.isAdmin) return navigate("/admin", { replace: true });
    navigate("/", { replace: true });
  }, [isInitialized, userInfo, fromPath, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      const res = await login({ email, password }).unwrap();
      dispatch(setCredentials(res.data));

      if (fromPath) return navigate(fromPath, { replace: true });
      if (res.data?.isAdmin) return navigate("/admin", { replace: true });
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.data?.message || err?.error || "Login failed");
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
      <p className="mt-1 text-sm text-slate-600">
        Access your Megadie account.
      </p>

      {/* ✅ Context banner */}
      {contextMessage ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">
            Action required
          </div>
          <div className="mt-1 text-sm text-slate-600">{contextMessage}</div>
        </div>
      ) : null}

      <form onSubmit={submitHandler} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !isInitialized}
          className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-slate-900 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      <div className="mt-6 text-sm text-slate-600">
        New here?{" "}
        <Link
          to="/register"
          state={{ from: location.state?.from || location }}
          className="font-semibold text-slate-900 hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
