import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";

function PaymentCallback() {
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState("verifying");

  const [message, setMessage] = useState(
    "Please wait while we confirm your payment."
  );

  useEffect(() => {
    const verifyPayment = async () => {
      const reference = searchParams.get("reference");

      if (!reference) {
        setStatus("failed");

        setMessage(
          "No payment reference was provided. We could not verify this payment."
        );

        return;
      }

      try {
        const response = await api.get(
          `/payments/verify/${encodeURIComponent(
            reference
          )}`
        );

        if (
          response.data?.status === "success" ||
          response.data?.payment?.status === "success"
        ) {
          setStatus("success");

          setMessage(
            "Your payment has been confirmed successfully."
          );
        } else {
          setStatus("failed");

          setMessage(
            response.data?.message ||
              "The payment could not be confirmed."
          );
        }
      } catch (error) {
        console.error(
          "Payment verification error:",
          error
        );

        setStatus("failed");

        setMessage(
          error.response?.data?.message ||
            "We could not verify your payment. Please check your payment history."
        );
      }
    };

    verifyPayment();
  }, [searchParams]);

  // ============================================================
  // VERIFYING
  // ============================================================

  if (status === "verifying") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Verifying Payment
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {message}
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUCCESS
  // ============================================================

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <svg
              className="h-8 w-8 text-emerald-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            Payment Successful
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {message}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/invoices"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              View Invoices
            </Link>

            <Link
              to="/payments"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Payment History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // FAILED
  // ============================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-8 w-8 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          Payment Could Not Be Confirmed
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          {message}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/invoices"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Back to Invoices
          </Link>

          <Link
            to="/payments"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Payment History
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PaymentCallback;