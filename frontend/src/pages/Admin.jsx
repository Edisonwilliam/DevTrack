import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import api from "../services/api";

function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeSection, setActiveSection] =
    useState("overview");

  // ============================================================
  // FETCH ADMIN DATA
  // ============================================================

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        statsResponse,
        usersResponse,
        projectsResponse,
        invoicesResponse,
        paymentsResponse,
      ] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
        api.get("/admin/projects"),
        api.get("/admin/invoices"),
        api.get("/admin/payments"),
      ]);

      setStats(statsResponse.data);
      setUsers(usersResponse.data);
      setProjects(projectsResponse.data);
      setInvoices(invoicesResponse.data);
      setPayments(paymentsResponse.data);
    } catch (err) {
      console.error("Admin data error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load admin data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // ============================================================
  // FORMATTERS
  // ============================================================

  const formatCurrency = (
    amount,
    currency = "NGN"
  ) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const formatPaymentAmount = (
    amount,
    currency = "NGN"
  ) => {
    // Payment amounts are stored in KOBO.
    return formatCurrency(
      Number(amount || 0) / 100,
      currency
    );
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "en-NG",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // ============================================================
  // DERIVED DATA
  // ============================================================

  const successfulPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.status === "success"
      ),
    [payments]
  );

  const pendingPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.status === "pending"
      ),
    [payments]
  );

  const paidInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.status === "paid"
      ),
    [invoices]
  );

  const unpaidInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.status !== "paid" &&
          invoice.status !== "cancelled"
      ),
    [invoices]
  );

  // ============================================================
  // STATUS STYLES
  // ============================================================

  const getStatusClasses = (status) => {
    const styles = {
      success:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",

      paid:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",

      pending:
        "bg-amber-50 text-amber-700 ring-1 ring-amber-200",

      failed:
        "bg-red-50 text-red-700 ring-1 ring-red-200",

      abandoned:
        "bg-slate-100 text-slate-600 ring-1 ring-slate-200",

      draft:
        "bg-slate-100 text-slate-600 ring-1 ring-slate-200",

      sent:
        "bg-blue-50 text-blue-700 ring-1 ring-blue-200",

      overdue:
        "bg-orange-50 text-orange-700 ring-1 ring-orange-200",

      cancelled:
        "bg-red-50 text-red-700 ring-1 ring-red-200",

      planning:
        "bg-violet-50 text-violet-700 ring-1 ring-violet-200",

      "in-progress":
        "bg-blue-50 text-blue-700 ring-1 ring-blue-200",

      completed:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    };

    return (
      styles[status] ||
      "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
    );
  };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const navigationItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      description: "Business overview",
    },
    {
      name: "Clients",
      path: "/clients",
      description: "Manage clients",
    },
    {
      name: "Projects",
      path: "/projects",
      description: "Manage projects",
    },
    {
      name: "Tasks",
      path: "/tasks",
      description: "Track work",
    },
    {
      name: "Invoices",
      path: "/invoices",
      description: "Manage invoices",
    },
    {
      name: "Payments",
      path: "/payments",
      description: "Track payments",
    },
    {
      name: "Admin",
      path: "/admin",
      description: "System administration",
    },
  ];

  const adminSections = [
    {
      id: "overview",
      label: "Overview",
    },
    {
      id: "users",
      label: "Users",
    },
    {
      id: "projects",
      label: "Projects",
    },
    {
      id: "invoices",
      label: "Invoices",
    },
    {
      id: "payments",
      label: "Payments",
    },
  ];

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 rounded-2xl bg-white" />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl bg-white"
              />
            ))}
          </div>

          <div className="h-96 rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-7 w-7 text-red-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.3 3.7l-8 14A2 2 0 004 20.7h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z"
              />
            </svg>
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-900">
            Unable to load admin data
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            onClick={fetchAdminData}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ======================================================
          ADMIN HEADER
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Administrator
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Admin Control Center
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Monitor users, projects, invoices, payments,
                and overall platform activity from one place.
              </p>
            </div>

            <button
              onClick={fetchAdminData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 11a8.1 8.1 0 00-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0015.5 2M20 19v-4h-4"
                />
              </svg>

              Refresh Data
            </button>
          </div>
        </div>

        {/* ====================================================
            QUICK NAVIGATION
        ==================================================== */}

        <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `group flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>
      </section>


      {/* ======================================================
          STAT CARDS
      ====================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Users */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Users
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {stats?.totalUsers ?? 0}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Registered accounts
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                />
              </svg>
            </div>
          </div>
        </div>


        {/* Projects */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Projects
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {stats?.totalProjects ?? 0}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Across all users
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7h5l2 2h11v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                />
              </svg>
            </div>
          </div>
        </div>


        {/* Invoices */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Invoices
              </p>

              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {stats?.totalInvoices ?? 0}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {paidInvoices.length} paid
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 3h10a2 2 0 012 2v16l-7-4-7 4V5a2 2 0 012-2z"
                />
              </svg>
            </div>
          </div>
        </div>


        {/* Revenue */}
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Revenue
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(
                  stats?.totalRevenue ?? 0
                )}
              </p>

              <p className="mt-2 text-xs text-emerald-600">
                {successfulPayments.length} successful payments
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 2v20M17 5.5A4.5 4.5 0 0012.5 3C10 3 8 4.5 8 6.5S10 10 12.5 10s4.5 1.5 4.5 3.5S15 17 12.5 17A4.5 4.5 0 018 14.5"
                />
              </svg>
            </div>
          </div>
        </div>

      </section>


      {/* ======================================================
          ADMIN SUMMARY
      ====================================================== */}

      <section className="grid gap-6 lg:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Payment Overview
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Current payment activity
              </p>
            </div>

            <NavLink
              to="/payments"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View payments
            </NavLink>
          </div>

          <div className="mt-6 space-y-4">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Total payments
              </span>

              <span className="font-semibold text-slate-900">
                {stats?.totalPayments ?? 0}
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Successful
              </span>

              <span className="font-semibold text-emerald-600">
                {stats?.successfulPayments ?? 0}
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Pending
              </span>

              <span className="font-semibold text-amber-600">
                {stats?.pendingPayments ?? 0}
              </span>
            </div>

          </div>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-slate-900">
              Invoice Overview
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Current invoice distribution
            </p>
          </div>

          <div className="mt-6 space-y-4">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Total invoices
              </span>

              <span className="font-semibold text-slate-900">
                {invoices.length}
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Paid
              </span>

              <span className="font-semibold text-emerald-600">
                {paidInvoices.length}
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Unpaid
              </span>

              <span className="font-semibold text-amber-600">
                {unpaidInvoices.length}
              </span>
            </div>

          </div>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-slate-900">
              Platform Activity
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Current platform totals
            </p>
          </div>

          <div className="mt-6 space-y-4">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Users
              </span>

              <span className="font-semibold text-slate-900">
                {users.length}
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Projects
              </span>

              <span className="font-semibold text-slate-900">
                {projects.length}
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Payments
              </span>

              <span className="font-semibold text-slate-900">
                {payments.length}
              </span>
            </div>

          </div>
        </div>

      </section>


      {/* ======================================================
          SECTION NAVIGATION
      ====================================================== */}

      <section className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex gap-1 overflow-x-auto">
          {adminSections.map((section) => (
            <button
              key={section.id}
              onClick={() =>
                setActiveSection(section.id)
              }
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                activeSection === section.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </section>


      {/* ======================================================
          USERS
      ====================================================== */}

      {activeSection === "users" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Users
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                All registered DevTrack users
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {users.length} users
            </span>
          </div>

          {users.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      User
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Joined
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr
                      key={user._id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-semibold text-indigo-700">
                            {user.name
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {user.name}
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>
      )}


      {/* ======================================================
          PROJECTS
      ====================================================== */}

      {activeSection === "projects" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-200 px-5 py-5">
            <h2 className="font-semibold text-slate-900">
              Projects
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Projects across the platform
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No projects found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Project
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Owner
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Budget
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {projects.map((project) => (
                    <tr
                      key={project._id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {project.name}
                        </p>

                        <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {project.description ||
                            "No description"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {project.user?.name || "-"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {project.user?.email || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {project.client?.name || "-"}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {formatCurrency(project.budget)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                            project.status
                          )}`}
                        >
                          {project.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>
      )}


      {/* ======================================================
          INVOICES
      ====================================================== */}

      {activeSection === "invoices" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Invoices
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                All invoices created on the platform
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {invoices.length} invoices
            </span>
          </div>

          {invoices.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No invoices found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Owner
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Client
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Due
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {invoice.invoiceNumber}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(invoice.issueDate)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {invoice.user?.name || "-"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {invoice.user?.email || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm text-slate-700">
                          {invoice.client?.name || "-"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {invoice.client?.email || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatCurrency(invoice.total)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>
      )}


      {/* ======================================================
          PAYMENTS
      ====================================================== */}

      {activeSection === "payments" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Payments
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Payment transactions across the platform
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {payments.length} payments
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No payments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Reference
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      User
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Invoice
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Invoice Total
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Payment
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr
                      key={payment._id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-slate-500">
                          {payment.reference}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-700">
                          {payment.user?.name || "-"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {payment.user?.email || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {payment.invoice
                            ?.invoiceNumber || "-"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {payment.invoice?.client?.name ||
                            "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {payment.invoice
                          ? formatCurrency(
                              payment.invoice.total
                            )
                          : "-"}
                      </td>

                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {formatPaymentAmount(
                          payment.amount,
                          payment.currency
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                            payment.status
                          )}`}
                        >
                          {payment.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(
                          payment.paidAt ||
                            payment.createdAt
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </section>
      )}


      {/* ======================================================
          OVERVIEW
      ====================================================== */}

      {activeSection === "overview" && (
        <section className="grid gap-6 lg:grid-cols-2">

          {/* Recent users */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Recent Users
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Latest registered accounts
                </p>
              </div>

              <button
                onClick={() =>
                  setActiveSection("users")
                }
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {users.slice(0, 5).map((user) => (
                <div
                  key={user._id}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                    {user.name
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {user.name}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>

                  <span className="text-xs text-slate-400">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              ))}

              {users.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No users yet.
                </div>
              )}
            </div>
          </div>


          {/* Recent payments */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Recent Payments
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Latest payment activity
                </p>
              </div>

              <button
                onClick={() =>
                  setActiveSection("payments")
                }
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View all
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {payments.slice(0, 5).map((payment) => (
                <div
                  key={payment._id}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    ₦
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {payment.invoice
                        ?.invoiceNumber || "Payment"}
                    </p>

                    <p className="truncate text-xs text-slate-500">
                      {payment.user?.name || "Unknown user"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatPaymentAmount(
                        payment.amount,
                        payment.currency
                      )}
                    </p>

                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${getStatusClasses(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}

              {payments.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  No payments yet.
                </div>
              )}
            </div>
          </div>

        </section>
      )}

    </div>
  );
}

export default Admin;