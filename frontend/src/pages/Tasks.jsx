import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const initialFormData = {
  title: "",
  description: "",
  project: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
};

const statusStyles = {
  todo: "bg-slate-100 text-slate-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const priorityStyles = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

const statusLabels = {
  todo: "To Do",
  "in-progress": "In Progress",
  completed: "Completed",
};

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [formData, setFormData] = useState({
    ...initialFormData,
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const response = await api.get("/tasks");

      console.log("Tasks API response:", response.data);

      if (Array.isArray(response.data)) {
        setTasks(response.data);
      } else if (Array.isArray(response.data.tasks)) {
        setTasks(response.data.tasks);
      } else {
        setTasks([]);
        setError("Invalid tasks response from server.");
      }
    } catch (err) {
      console.error("Fetch tasks error:", err);

      setTasks([]);

      setError(
        err.response?.data?.message ||
          "Failed to load tasks."
      );
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const response = await api.get("/projects");

      console.log("Projects API response:", response.data);

      if (Array.isArray(response.data)) {
        setProjects(response.data);
      } else if (Array.isArray(response.data.projects)) {
        setProjects(response.data.projects);
      } else {
        setProjects([]);
        setError("Invalid projects response from server.");
      }
    } catch (err) {
      console.error("Fetch projects error:", err);

      setProjects([]);

      setError(
        err.response?.data?.message ||
          "Failed to load projects."
      );
    }
  };

  // Fetch tasks and projects
  const fetchData = async () => {
    setLoading(true);
    setError("");

    await Promise.all([
      fetchTasks(),
      fetchProjects(),
    ]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    const query = search.toLowerCase().trim();

    return tasks.filter((task) => {
      const title = task.title || "";
      const description = task.description || "";
      const projectName = task.project?.name || "";

      const matchesSearch =
        title.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query) ||
        projectName.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        task.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [
    tasks,
    search,
    statusFilter,
    priorityFilter,
  ]);

  // Handle form changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // Open create modal
  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({
      ...initialFormData,
    });
    setFormError("");
    setShowForm(true);
  };

  // Open edit modal
  const openEditModal = (task) => {
    setEditingTask(task);

    setFormData({
      title: task.title || "",
      description: task.description || "",
      project:
        task.project?._id ||
        task.project ||
        "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      dueDate: task.dueDate
        ? task.dueDate.slice(0, 10)
        : "",
    });

    setFormError("");
    setShowForm(true);
  };

  // Close modal
  const closeModal = () => {
    if (submitting) return;

    setShowForm(false);
    setEditingTask(null);
    setFormData({
      ...initialFormData,
    });
    setFormError("");
  };

  // Create / update task
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        project: formData.project,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
      };

      if (editingTask) {
        const response = await api.put(
          `/tasks/${editingTask._id}`,
          payload
        );

        const updatedTask =
          response.data.task ||
          response.data;

        setTasks((current) =>
          current.map((task) =>
            task._id === editingTask._id
              ? updatedTask
              : task
          )
        );
      } else {
        const response = await api.post(
          "/tasks",
          payload
        );

        const newTask =
          response.data.task ||
          response.data;

        setTasks((current) => [
          newTask,
          ...current,
        ]);
      }

      closeModal();
    } catch (err) {
      console.error("Save task error:", err);

      setFormError(
        err.response?.data?.message ||
          "Failed to save task."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete task
  const handleDelete = async (taskId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/tasks/${taskId}`);

      setTasks((current) =>
        current.filter(
          (task) => task._id !== taskId
        )
      );
    } catch (err) {
      console.error("Delete task error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to delete task."
      );
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Loading tasks...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Tasks
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Track your project work and deadlines.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          + Add Task
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Search tasks or projects..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">
            All Statuses
          </option>

          <option value="todo">
            To Do
          </option>

          <option value="in-progress">
            In Progress
          </option>

          <option value="completed">
            Completed
          </option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">
            All Priorities
          </option>

          <option value="low">
            Low Priority
          </option>

          <option value="medium">
            Medium Priority
          </option>

          <option value="high">
            High Priority
          </option>
        </select>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-900">
            No tasks found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {tasks.length === 0
              ? "Create your first task to get started."
              : "Try changing your search or filters."}
          </p>

          {tasks.length === 0 && (
            <button
              onClick={openCreateModal}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Create Task
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Task
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Project
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Priority
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due Date
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr
                    key={task._id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">
                        {task.title}
                      </p>

                      {task.description && (
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {task.description}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {task.project?.name ||
                        "Unknown project"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          priorityStyles[
                            task.priority
                          ] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {priorityLabels[
                          task.priority
                        ] || task.priority}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[
                            task.status
                          ] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {statusLabels[
                          task.status
                        ] || task.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(task.dueDate)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            openEditModal(task)
                          }
                          className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              task._id
                            )
                          }
                          className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingTask
                    ? "Edit Task"
                    : "Add Task"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingTask
                    ? "Update your task details."
                    : "Create a task for one of your projects."}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Task Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Build homepage"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Describe what needs to be done..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Project */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Project
                </label>

                <select
                  name="project"
                  value={formData.project}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">
                    Select a project
                  </option>

                  {projects.map((project) => (
                    <option
                      key={project._id}
                      value={project._id}
                    >
                      {project.name}
                    </option>
                  ))}
                </select>

                {projects.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    Create a project before creating
                    a task.
                  </p>
                )}
              </div>

              {/* Status + Priority */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="todo">
                      To Do
                    </option>

                    <option value="in-progress">
                      In Progress
                    </option>

                    <option value="completed">
                      Completed
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Priority
                  </label>

                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="low">
                      Low
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="high">
                      High
                    </option>
                  </select>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Due Date
                </label>

                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    projects.length === 0
                  }
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingTask
                    ? "Update Task"
                    : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;