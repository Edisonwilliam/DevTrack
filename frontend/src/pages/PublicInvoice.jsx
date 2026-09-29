import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

const statusStyles = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-600",
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

function PublicInvoice() {
  const { token } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        setError("");

        if (!token) {
          setError("Invalid invoice link.");
          return;
        }

        const response = await api.get(`/invoices/public/${token}`);

        setInvoice(response.data?.invoice || null);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load this invoice."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [token]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getClientName = () => {
    return (
      invoice?.client?.name ||
      invoice?.client?.company ||
      "Client"
    );
  };

  const getBusinessName = () => {
    const firstName = invoice?.user?.firstName || "";
    const lastName = invoice?.user?.lastName || "";

    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || "DevTrack User";
  };

  const getStatusLabel = () => {
    return (
      statusLabels[invoice?.status] ||
      invoice?.status ||
      "Unknown"
    );
  };

  const handlePayInvoice = async () => {
    if (!token || paying) {
      return;
    }

    try {
      setPaying(true);
      setPaymentError("");

      const response = await api.post(
        "/payments/public/initialize",
        {
          token,
        }
      );

      const {
        checkoutUrl,
        message,
      } = response.data || {};

      if (!checkoutUrl) {
        setPaymentError(
          message ||
            "A payment session could not be created. Please try again."
        );
        return;
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      setPaymentError(
        err.response?.data?.message ||
          "Unable to initialize payment. Please try again."
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />

          <p className="text-sm text-slate-500">
            Loading invoice...
          </p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
              className="h-7 w-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0 3.75h.007v.007H12v-.007ZM10.29 3.86l-8.02 14A2 2 0 0 0 4 20.86h16a2 2 0 0 0 1.73-3l-8.02-14a2 2 0 0 0-3.42 0Z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            Invoice unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ||
              "We could not find the invoice you're looking for."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Top Brand */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              DevTrack
            </h1>

            <p className="text-xs text-slate-500">
              Invoice
            </p>
          </div>

          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
              statusStyles[invoice.status] ||
              "bg-slate-100 text-slate-700"
            }`}
          >
            {getStatusLabel()}
          </span>
        </div>

        {/* Invoice Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-8 sm:px-10">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  From
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {getBusinessName()}
                </h2>

                {invoice.user?.email && (
                  <p className="mt-1 text-sm text-slate-500">
                    {invoice.user.email}
                  </p>
                )}
              </div>

              <div className="sm:text-right">
                <p className="text-sm font-medium text-slate-500">
                  Invoice
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {invoice.invoiceNumber}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Issued {formatDate(invoice.issueDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Client / Invoice Details */}
          <div className="grid gap-6 border-b border-slate-200 px-6 py-8 sm:grid-cols-2 sm:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bill To
              </p>

              <h3 className="mt-2 text-base font-semibold text-slate-900">
                {getClientName()}
              </h3>

              {invoice.client?.company &&
                invoice.client.name && (
                  <p className="mt-1 text-sm text-slate-500">
                    {invoice.client.company}
                  </p>
                )}

              {invoice.client?.email && (
                <p className="mt-1 text-sm text-slate-500">
                  {invoice.client.email}
                </p>
              )}

              {invoice.client?.phone && (
                <p className="mt-1 text-sm text-slate-500">
                  {invoice.client.phone}
                </p>
              )}

              {invoice.client?.address && (
                <p className="mt-1 text-sm text-slate-500">
                  {invoice.client.address}
                </p>
              )}
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Payment Details
              </p>

              <div className="mt-2 space-y-1">
                {invoice.project?.name && (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">
                      Project:
                    </span>{" "}
                    {invoice.project.name}
                  </p>
                )}

                <p className="text-sm text-slate-600">
                  <span className="font-medium">
                    Due:
                  </span>{" "}
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="px-6 py-8 sm:px-10">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Invoice Items
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Description
                    </th>

                    <th className="pb-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Qty
                    </th>

                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Unit Price
                    </th>

                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {Array.isArray(invoice.items) &&
                    invoice.items.map((item, index) => (
                      <tr key={item._id || index}>
                        <td className="py-4 pr-4 text-sm font-medium text-slate-900">
                          {item.description}
                        </td>

                        <td className="py-4 text-center text-sm text-slate-600">
                          {item.quantity}
                        </td>

                        <td className="py-4 text-right text-sm text-slate-600">
                          {formatCurrency(item.unitPrice)}
                        </td>

                        <td className="py-4 text-right text-sm font-semibold text-slate-900">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-8 sm:px-10">
            <div className="ml-auto max-w-sm space-y-3">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>

                <span className="font-medium text-slate-900">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-sm text-slate-600">
                <span>
                  Tax ({Number(invoice.tax) || 0}%)
                </span>

                <span className="font-medium text-slate-900">
                  {formatCurrency(invoice.taxAmount)}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">
                    Total
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="border-t border-slate-200 px-6 py-8 sm:px-10">
            {invoice.status === "paid" ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                <p className="font-semibold text-green-800">
                  This invoice has been paid.
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Thank you for your payment.
                </p>
              </div>
            ) : invoice.status === "cancelled" ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                <p className="font-semibold text-slate-700">
                  This invoice has been cancelled.
                </p>
              </div>
            ) : (
              <div>
                {paymentError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-700">
                      {paymentError}
                    </p>
                  </div>
                )}

                <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50 p-5 sm:flex-row">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Ready to pay?
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      Pay securely with Paystack.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePayInvoice}
                    disabled={paying}
                    className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {paying ? "Preparing payment..." : "Pay Invoice"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="py-6 text-center">
          <p className="text-xs text-slate-400">
            Powered by DevTrack
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicInvoice;
