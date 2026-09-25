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

const projectStatusClasses = {
  planning: "bg-slate-100 text-slate-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

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
    if (!data?.projectStatusStats) return [];

    return data.projectStatusStats.map((item) => ({
      name:
        projectStatusLabels[item._id] || item._id,
      value: item.count,
      status: item._id,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-800">
          Dashboard error
        </h2>

        <p className="mt-1 text-sm text-red-700">
          {error}
        </p>

        <button
          onClick={fetchDashboard}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  const totalTasks = data?.tasks || 0;
  const completedTasks = data?.completedTasks || 0;
  const pendingTasks = data?.pendingTasks || 0;

  const taskCompletionRate =
    totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

  const totalProjects = data?.projects || 0;
  const activeProjects = data?.activeProjects || 0;
  const completedProjects = data?.completedProjects || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Here's an overview of your freelance business.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Clients"
          value={data?.clients || 0}
          description="Your active client list"
          icon="👥"
        />

        <StatCard
          title="Projects"
          value={totalProjects}
          description={`${activeProjects} active`}
          icon="📁"
        />

        <StatCard
          title="Tasks"
          value={totalTasks}
          description={`${pendingTasks} pending`}
          icon="✓"
        />

        <StatCard
          title="Project Value"
          value={formatCurrency(
            data?.totalProjectValue || 0
          )}
          description="Total project budgets"
          icon="₦"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label="Active Projects"
          value={activeProjects}
        />

        <MiniStat
          label="Completed Projects"
          value={completedProjects}
        />

        <MiniStat
          label="Completed Tasks"
          value={completedTasks}
        />

        <MiniStat
          label="Task Completion"
          value={`${taskCompletionRate}%`}
        />
      </div>

      {/* Charts + Task Progress */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Status Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900">
              Project Status
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Breakdown of your current projects.
            </p>
          </div>

          {projectChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              No project data available.
            </div>
          ) : (
            <div className="h-64">
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
                    outerRadius={90}
                    innerRadius={55}
                    paddingAngle={3}
                  >
                    {projectChartData.map(
                      (entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {projectChartData.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="text-sm text-slate-600">
                  {item.name}
                </span>

                <span className="text-sm font-semibold text-slate-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Task Progress */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="font-semibold text-slate-900">
              Task Progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Track how much of your work is complete.
            </p>
          </div>

          <div className="flex items-center justify-center py-5">
            <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-[18px] border-slate-100">
              <div
                className="absolute inset-[-18px] rounded-full"
                style={{
                  background: `conic-gradient(
                    #4f46e5 ${taskCompletionRate}%,
                    transparent ${taskCompletionRate}%
                  )`,
                  mask:
                    "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 0)",
                  WebkitMask:
                    "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 0)",
                }}
              />

              <div className="text-center">
                <p className="text-3xl font-bold text-slate-900">
                  {taskCompletionRate}%
                </p>

                <p className="text-xs text-slate-500">
                  completed
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-indigo-50 p-4">
              <p className="text-xs font-medium text-indigo-600">
                Completed
              </p>

              <p className="mt-1 text-xl font-bold text-indigo-900">
                {completedTasks}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Pending
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {pendingTasks}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Overview */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="font-semibold text-slate-900">
            Project Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Summary of your project pipeline.
          </p>
        </div>

        <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <OverviewItem
            label="Total Projects"
            value={totalProjects}
          />

          <OverviewItem
            label="Active"
            value={activeProjects}
          />

          <OverviewItem
            label="Completed"
            value={completedProjects}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl bg-slate-900 p-6 text-white">
        <h2 className="text-lg font-semibold">
          Quick Actions
        </h2>

        <p className="mt-1 text-sm text-slate-300">
          Keep your freelance workflow moving.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
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
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function OverviewItem({ label, value }) {
  return (
    <div className="px-6 py-5">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function QuickAction({ href, label }) {
  return (
    <a
      href={href}
      className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
    >
      + {label}
    </a>
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default Dashboard;