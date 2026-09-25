import { useEffect, useMemo, useState } from "react";
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

const getInitialFormData = () => ({
  client: "",
  project: "",
  dueDate: "",
  tax: "0",
  items: [
    {
      description: "",
      quantity: 1,
      unitPrice: "",
    },
  ],
});

const getArrayResponse = (data, key) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const getObjectResponse = (data, key) => {
  if (data?.[key]) {
    return data[key];
  }

  return data;
};

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const [formData, setFormData] = useState(getInitialFormData());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchInvoices = async () => {
    const response = await api.get("/invoices");

    return getArrayResponse(response.data, "invoices");
  };

  const fetchClients = async () => {
    const response = await api.get("/clients");

    return getArrayResponse(response.data, "clients");
  };

  const fetchProjects = async () => {
    const response = await api.get("/projects");

    return getArrayResponse(response.data, "projects");
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const [invoiceData, clientData, projectData] =
        await Promise.all([
          fetchInvoices(),
          fetchClients(),
          fetchProjects(),
        ]);

      setInvoices(invoiceData);
      setClients(clientData);
      setProjects(projectData);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load invoices."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const clientName =
        invoice.client?.name ||
        invoice.client?.company ||
        invoice.clientName ||
        "";

      const projectName =
        invoice.project?.name ||
        invoice.projectName ||
        "";

      const invoiceNumber =
        invoice.invoiceNumber ||
        invoice.number ||
        invoice._id ||
        "";

      const matchesSearch =
        !searchTerm ||
        clientName.toLowerCase().includes(searchTerm) ||
        projectName.toLowerCase().includes(searchTerm) ||
        invoiceNumber.toLowerCase().includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const availableProjects = useMemo(() => {
    if (!formData.client) {
      return projects;
    }

    return projects.filter((project) => {
      const projectClientId =
        project.client?._id ||
        project.client?.id ||
        project.clientId ||
        project.client;

      return String(projectClientId) === String(formData.client);
    });
  }, [projects, formData.client]);

  const subtotal = useMemo(() => {
    return formData.items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;

      return sum + quantity * unitPrice;
    }, 0);
  }, [formData.items]);

  const taxAmount = useMemo(() => {
    const taxRate = Number(formData.tax) || 0;

    return subtotal * (taxRate / 100);
  }, [subtotal, formData.tax]);

  const total = subtotal + taxAmount;

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
      month: "short",
      year: "numeric",
    });
  };

  const getClientName = (invoice) => {
    return (
      invoice.client?.name ||
      invoice.client?.company ||
      invoice.clientName ||
      "Unknown client"
    );
  };

  const getProjectName = (invoice) => {
    return (
      invoice.project?.name ||
      invoice.projectName ||
      "No project"
    );
  };

  const getInvoiceNumber = (invoice) => {
    return (
      invoice.invoiceNumber ||
      invoice.number ||
      `INV-${String(invoice._id || "").slice(-6).toUpperCase()}`
    );
  };

  const getStatusLabel = (status) => {
    return statusLabels[status] || status || "Unknown";
  };

  const openCreateModal = () => {
    setEditingInvoice(null);
    setFormData(getInitialFormData());
    setFormError("");
    setError("");
    setShowForm(true);
  };

  const openEditModal = (invoice) => {
    setEditingInvoice(invoice);
    setFormError("");
    setError("");

    setFormData({
      client:
        invoice.client?._id ||
        invoice.client?.id ||
        invoice.clientId ||
        invoice.client ||
        "",
      project:
        invoice.project?._id ||
        invoice.project?.id ||
        invoice.projectId ||
        invoice.project ||
        "",
      dueDate: invoice.dueDate
        ? new Date(invoice.dueDate)
            .toISOString()
            .split("T")[0]
        : "",
      tax: String(invoice.tax ?? 0),
      items:
        Array.isArray(invoice.items) && invoice.items.length > 0
          ? invoice.items.map((item) => ({
              description: item.description || "",
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice ?? "",
            }))
          : [
              {
                description: "",
                quantity: 1,
                unitPrice: "",
              },
            ],
    });

    setShowForm(true);
  };

  const resetModal = () => {
    setShowForm(false);
    setEditingInvoice(null);
    setFormData(getInitialFormData());
    setFormError("");
  };

  const closeModal = () => {
    if (submitting) {
      return;
    }

    resetModal();
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (name === "client") {
      setFormData((current) => ({
        ...current,
        client: value,
        project: "",
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData((current) => {
      const updatedItems = [...current.items];

      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };

      return {
        ...current,
        items: updatedItems,
      };
    });
  };

  const addItem = () => {
    setFormData((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          description: "",
          quantity: 1,
          unitPrice: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setFormData((current) => {
      if (current.items.length === 1) {
        return current;
      }

      return {
        ...current,
        items: current.items.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  const validateForm = () => {
    if (!formData.client) {
      return "Please select a client.";
    }

    if (!formData.dueDate) {
      return "Please select a due date.";
    }

    if (!formData.items.length) {
      return "Please add at least one invoice item.";
    }

    for (const item of formData.items) {
      if (!item.description.trim()) {
        return "Every invoice item needs a description.";
      }

      if (!Number(item.quantity) || Number(item.quantity) <= 0) {
        return "Quantity must be greater than zero.";
      }

      if (
        item.unitPrice === "" ||
        Number(item.unitPrice) < 0
      ) {
        return "Please enter a valid unit price.";
      }
    }

    if (Number(formData.tax) < 0) {
      return "Tax cannot be negative.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      setError("");

      const payload = {
        client: formData.client,
        project: formData.project || undefined,
        dueDate: formData.dueDate,
        tax: Number(formData.tax) || 0,
        items: formData.items.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      if (editingInvoice) {
        const response = await api.put(
          `/invoices/${editingInvoice._id}`,
          payload
        );

        const updatedInvoice = getObjectResponse(
          response.data,
          "invoice"
        );

        setInvoices((current) =>
          current.map((invoice) =>
            invoice._id === editingInvoice._id
              ? updatedInvoice
              : invoice
          )
        );
      } else {
        const response = await api.post(
          "/invoices",
          payload
        );

        const newInvoice = getObjectResponse(
          response.data,
          "invoice"
        );

        setInvoices((current) => [
          newInvoice,
          ...current,
        ]);
      }

      resetModal();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save invoice."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (invoice) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${getInvoiceNumber(
        invoice
      )}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await api.delete(`/invoices/${invoice._id}`);

      setInvoices((current) =>
        current.filter(
          (item) => item._id !== invoice._id
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete invoice."
      );
    }
  };

  const handlePayNow = async (invoiceId) => {
    try {
      setError("");

      const response = await api.post(
        "/payments/initialize",
        {
          invoiceId,
        }
      );

      const checkoutUrl = response.data?.checkoutUrl;

      if (!checkoutUrl) {
        throw new Error(
          "Paystack checkout URL was not returned."
        );
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to initialize payment."
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm text-slate-500">
          Loading invoices...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, manage, and track your invoices.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          + Create Invoice
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search invoices..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">
              Cancelled
            </option>
          </select>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Invoice
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Client
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Project
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Due Date
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>

                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center"
                  >
                    <div className="text-sm text-slate-500">
                      No invoices found.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice._id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        {getInvoiceNumber(invoice)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">
                        {getClientName(invoice)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {getProjectName(invoice)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {formatDate(invoice.dueDate)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(
                          invoice.total ??
                            invoice.amount ??
                            0
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[
                            invoice.status
                          ] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {getStatusLabel(
                          invoice.status
                        )}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {invoice.status !== "paid" &&
                          invoice.status !==
                            "cancelled" && (
                            <>
                              <button
                                onClick={() =>
                                  openEditModal(
                                    invoice
                                  )
                                }
                                className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(
                                    invoice
                                  )
                                }
                                className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                              >
                                Delete
                              </button>

                              <button
                                onClick={() =>
                                  handlePayNow(
                                    invoice._id
                                  )
                                }
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                              >
                                Pay Now
                              </button>
                            </>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingInvoice
                    ? "Edit Invoice"
                    : "Create Invoice"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the invoice details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="text-2xl text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6"
            >
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Client / Project */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Client
                  </label>

                  <select
                    name="client"
                    value={formData.client}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">
                      Select client
                    </option>

                    {clients.map((client) => (
                      <option
                        key={client._id}
                        value={client._id}
                      >
                        {client.name ||
                          client.company ||
                          "Unnamed client"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Project
                  </label>

                  <select
                    name="project"
                    value={formData.project}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">
                      No project
                    </option>

                    {availableProjects.map(
                      (project) => (
                        <option
                          key={project._id}
                          value={project._id}
                        >
                          {project.name ||
                            project.title ||
                            "Unnamed project"}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Due Date / Tax */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Due Date
                  </label>

                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Tax (%)
                  </label>

                  <input
                    type="number"
                    name="tax"
                    min="0"
                    step="0.01"
                    value={formData.tax}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Invoice Items
                  </h3>

                  <button
                    type="button"
                    onClick={addItem}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="grid gap-3 md:grid-cols-[1fr_120px_160px_auto]">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Description
                            </label>

                            <input
                              type="text"
                              value={item.description}
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  "description",
                                  event.target.value
                                )
                              }
                              placeholder="e.g. Website development"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Quantity
                            </label>

                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  "quantity",
                                  event.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Unit Price
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(event) =>
                                handleItemChange(
                                  index,
                                  "unitPrice",
                                  event.target.value
                                )
                              }
                              placeholder="0.00"
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() =>
                                removeItem(index)
                              }
                              disabled={
                                formData.items.length ===
                                1
                              }
                              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 text-right text-sm font-semibold text-slate-700">
                          {formatCurrency(
                            (Number(
                              item.quantity
                            ) || 0) *
                              (Number(
                                item.unitPrice
                              ) || 0)
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-slate-50 p-4">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-slate-600">
                  <span>
                    Tax ({Number(formData.tax) || 0}%)
                  </span>

                  <span>
                    {formatCurrency(taxAmount)}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-2">
                  <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Total</span>
                    <span>
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? "Saving..."
                    : editingInvoice
                    ? "Update Invoice"
                    : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoices;