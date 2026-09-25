import { useEffect, useState } from "react";
import api from "../services/api";

function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/payments");

      setPayments(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load payments."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // The backend stores payment.amount in KOBO.
  // Convert to NAIRA only when displaying it.
  const formatPaymentAmount = (amount, currency = "NGN") => {
    const amountInNaira = Number(amount || 0) / 100;

    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amountInNaira);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClasses = (status) => {
    const styles = {
      success: "bg-emerald-50 text-emerald-700",
      pending: "bg-amber-50 text-amber-700",
      failed: "bg-red-50 text-red-700",
      abandoned: "bg-slate-100 text-slate-600",
    };

    return (
      styles[status] ||
      "bg-slate-100 text-slate-600"
    );
  };

  const successfulPayments = payments.filter(
    (payment) => payment.status === "success"
  );

  // Convert each successful payment from kobo to naira.
  const totalPaid = successfulPayments.reduce(
    (total, payment) =>
      total + Number(payment.amount || 0) / 100,
    0
  );

  const pendingPayments = payments.filter(
    (payment) => payment.status === "pending"
  );

  const formatNaira = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Payments
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Track payments made against your invoices.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Total Received
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatNaira(totalPaid)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Successful Payments
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {successfulPayments.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">
            Pending Payments
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {pendingPayments.length}
          </p>
        </div>
      </div>

      {/* Payment history */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">
            Payment History
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading payments...
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600">
              {error}
            </p>

            <button
              onClick={fetchPayments}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">
              No payments yet
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Payments will appear here once an invoice is paid.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    Invoice
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Client
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Invoice Total
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Payment Amount
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Status
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Date
                  </th>

                  <th className="px-5 py-3 font-semibold">
                    Reference
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="hover:bg-slate-50"
                  >
                    {/* Invoice */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">
                        {payment.invoice?.invoiceNumber || "-"}
                      </p>
                    </td>

                    {/* Client */}
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-700">
                        {payment.invoice?.client?.name || "-"}
                      </p>

                      <p className="text-xs text-slate-400">
                        {payment.invoice?.client?.email || ""}
                      </p>
                    </td>

                    {/* Invoice total is already NAIRA */}
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {payment.invoice
                        ? formatNaira(
                            payment.invoice.total
                          )
                        : "-"}
                    </td>

                    {/* Payment amount is KOBO */}
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {formatPaymentAmount(
                        payment.amount,
                        payment.currency
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                          payment.status
                        )}`}
                      >
                        {payment.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(
                        payment.paidAt ||
                          payment.createdAt
                      )}
                    </td>

                    {/* Reference */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-slate-500">
                        {payment.reference}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Payments;