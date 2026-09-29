import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import api from "../services/api";

const projectStatusLabels = {
  planning: "Planning",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const chartColors = [
  "#6366f1",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
];

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/dashboard");

      console.log("DASHBOARD API RESPONSE:", response.data);

      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const projectChartData = useMemo(() => {
    if (!data?.projectStatusStats) {
      return [];
    }

    return data.projectStatusStats.map((item) => ({
      name:
        projectStatusLabels[item._id] || item._id,
      value: item.count,
      status: item._id,
    }));
  }, [data]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            !
          </div>

          <div>
            <h2 className="font-semibold text-red-900">
              Dashboard error
            </h2>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              onClick={fetchDashboard}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalTasks = data?.tasks || 0;
  const completedTasks = data?.completedTasks || 0;
  const pendingTasks = data?.pendingTasks || 0;

  const taskCompletionRate =
    totalTasks > 0
      ? Math.round(
          (completedTasks / totalTasks) * 100
        )
      : 0;

  const totalProjects = data?.projects || 0;
  const activeProjects = data?.activeProjects || 0;
  const completedProjects =
    data?.completedProjects || 0;

  const totalClients = data?.clients || 0;
  const totalProjectValue =
    data?.totalProjectValue || 0;

  return (
    <div className="space-y-8 pb-8">
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Workspace overview
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Dashboard
          </h1>

          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Keep track of your clients, projects,
            tasks, and overall freelance activity.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <RefreshIcon />
          Refresh
        </button>
      </div>

      {/* ================================================= */}
      {/* KPI CARDS */}
      {/* ================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={totalClients}
          description="Clients in your workspace"
          icon={<UsersIcon />}
          iconClass="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Projects"
          value={totalProjects}
          description={`${activeProjects} currently active`}
          icon={<FolderIcon />}
          iconClass="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Tasks"
          value={totalTasks}
          description={`${pendingTasks} still pending`}
          icon={<CheckIcon />}
          iconClass="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Project Value"
          value={formatCurrency(totalProjectValue)}
          description="Combined project budgets"
          icon={<WalletIcon />}
          iconClass="bg-violet-50 text-violet-600"
        />
      </div>

      {/* ================================================= */}
      {/* MAIN ANALYTICS */}
      {/* ================================================= */}

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* PROJECT STATUS */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Project Status
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A breakdown of your current project
                pipeline.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {totalProjects} total
            </div>
          </div>

          <div className="grid items-center gap-8 p-6 md:grid-cols-[1fr_190px]">
            {projectChartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-xl bg-slate-50">
                <div className="text-center">
                  <FolderIcon className="mx-auto h-8 w-8 text-slate-300" />

                  <p className="mt-3 text-sm font-medium text-slate-500">
                    No project data yet
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Create a project to see your
                    pipeline here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-72 min-w-0">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={projectChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={105}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {projectChartData.map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${entry.status}`}
                            fill={
                              chartColors[
                                index %
                                  chartColors.length
                              ]
                            }
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      formatter={(value, name) => [
                        value,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow:
                          "0 10px 30px rgba(15, 23, 42, 0.08)",
                      }}
                    />

                    <text
                      x="50%"
                      y="47%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-slate-950 text-3xl font-bold"
                    >
                      {totalProjects}
                    </text>

                    <text
                      x="50%"
                      y="57%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-slate-400 text-xs"
                    >
                      projects
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* LEGEND */}
            <div className="space-y-3">
              {projectChartData.length > 0 &&
                projectChartData.map(
                  (item, index) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              chartColors[
                                index %
                                  chartColors.length
                              ],
                          }}
                        />

                        <span className="text-sm font-medium text-slate-600">
                          {item.name}
                        </span>
                      </div>

                      <span className="text-sm font-bold text-slate-950">
                        {item.value}
                      </span>
                    </div>
                  )
                )}
            </div>
          </div>
        </div>

        {/* TASK PROGRESS */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-950">
              Task Progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your current completion rate.
            </p>
          </div>

          <div className="p-6">
            <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                />

                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="264"
                  strokeDashoffset={
                    264 -
                    (264 * taskCompletionRate) /
                      100
                  }
                />
              </svg>

              <div className="relative text-center">
                <p className="text-4xl font-bold tracking-tight text-slate-950">
                  {taskCompletionRate}%
                </p>

                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                  Completed
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <ProgressStat
                label="Completed"
                value={completedTasks}
                accent="indigo"
              />

              <ProgressStat
                label="Pending"
                value={pendingTasks}
                accent="slate"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================= */}
      {/* SECONDARY METRICS */}
      {/* ================================================= */}

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-950">
            At a glance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            A quick look at your current workload.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat
            label="Active Projects"
            value={activeProjects}
            icon={<ActivityIcon />}
          />

          <MiniStat
            label="Completed Projects"
            value={completedProjects}
            icon={<CheckCircleIcon />}
          />

          <MiniStat
            label="Completed Tasks"
            value={completedTasks}
            icon={<TaskIcon />}
          />

          <MiniStat
            label="Task Completion"
            value={`${taskCompletionRate}%`}
            icon={<ChartIcon />}
          />
        </div>
      </div>

      {/* ================================================= */}
      {/* PROJECT SUMMARY */}
      {/* ================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-950">
            Project Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your overall project pipeline at a glance.
          </p>
        </div>

        <div className="grid sm:grid-cols-3">
          <OverviewItem
            label="Total Projects"
            value={totalProjects}
            icon={<FolderIcon />}
          />

          <OverviewItem
            label="Active"
            value={activeProjects}
            icon={<ActivityIcon />}
          />

          <OverviewItem
            label="Completed"
            value={completedProjects}
            icon={<CheckCircleIcon />}
          />
        </div>
      </div>

      {/* ================================================= */}
      {/* QUICK ACTIONS */}
      {/* ================================================= */}

      <div className="overflow-hidden rounded-2xl bg-slate-950 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Quick actions
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
              Keep your workflow moving.
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Quickly jump into the tools you use most.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <QuickAction
              href="/clients"
              label="Add Client"
            />

            <QuickAction
              href="/projects"
              label="Create Project"
            />

            <QuickAction
              href="/tasks"
              label="Create Task"
            />

            <QuickAction
              href="/invoices"
              label="Create Invoice"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================================================== */
/* COMPONENTS */
/* ===================================================== */

function StatCard({
  title,
  value,
  description,
  icon,
  iconClass,
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-1.5 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function ProgressStat({
  label,
  value,
  accent,
}) {
  const styles =
    accent === "indigo"
      ? "bg-indigo-50 text-indigo-600"
      : "bg-slate-50 text-slate-500";

  return (
    <div className={`rounded-xl p-4 ${styles}`}>
      <p className="text-xs font-semibold">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
        {icon}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-xl font-bold text-slate-950">
          {value}
        </p>
      </div>
    </div>
  );
}

function OverviewItem({
  label,
  value,
  icon,
}) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>

      <div>
        <p className="text-sm text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {value}
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
    >
      <span className="text-indigo-300">
        +
      </span>

      {label}
    </a>
  );
}

/* ===================================================== */
/* SKELETON */
/* ===================================================== */

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="h-[430px] animate-pulse rounded-2xl bg-slate-100" />

        <div className="h-[430px] animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

/* ===================================================== */
/* ICONS */
/* ===================================================== */

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FolderIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
      <path d="M16 13h2" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
      />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-5 3 3 5-7" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M20 11a8.1 8.1 0 0 0-14.5-4.9L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8.1 8.1 0 0 0 14.5 4.9L20 16" />
      <path d="M20 20v-4h-4" />
    </svg>
  );
}

/* ===================================================== */
/* HELPERS */
/* ===================================================== */

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default Dashboard;
