import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import Loader from "../../components/common/Loader";
import ErrorMessage from "../../components/common/ErrorMessage";
import { useForgotPasswordMutation } from "../../features/auth/usersApiSlice";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation();

  const submitHandler = async (e) => {
    e.preventDefault();

    try {
      const res = await forgotPassword({ email }).unwrap();
      setDone(true);
      toast.success(res?.message || "Check your email for the reset link.");
    } catch (err) {
      toast.error(err?.data?.message || err?.error || "Request failed");
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Forgot password</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enter your email and we’ll send you a reset link.
      </p>

      {error ? <ErrorMessage error={error} className="mt-4" /> : null}

      {done ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">Check your inbox</div>
          <div className="mt-1 text-sm text-slate-600">
            If an account exists for <span className="font-semibold">{email}</span>, you’ll receive a reset link.
            <div className="mt-2">Tip: check Spam.</div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Back to sign in
            </Link>

            <button
              type="button"
              onClick={() => setDone(false)}
              className="text-sm font-semibold text-slate-900 hover:underline"
            >
              Try another email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submitHandler} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? "Sending…" : "Send reset link"}
          </button>

          {isLoading ? (
            <div className="pt-2">
              <Loader />
            </div>
          ) : null}

          <div className="text-sm text-slate-600">
            Remembered your password?{" "}
            <Link to="/login" className="font-semibold text-slate-900 hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
