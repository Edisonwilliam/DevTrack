import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const initialFormData = {
  name: "",
  description: "",
  client: "",
  budget: "",
  status: "planning",
  startDate: "",
  dueDate: "",
};

const statusStyles = {
  planning: "bg-slate-100 text-slate-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels = {
  planning: "Planning",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

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

  // Fetch clients
  const fetchClients = async () => {
    try {
      const response = await api.get("/clients");

      console.log("Clients API response:", response.data);

      if (Array.isArray(response.data)) {
        setClients(response.data);
      } else if (Array.isArray(response.data.clients)) {
        setClients(response.data.clients);
      } else {
        setClients([]);
        setError("Invalid clients response from server.");
      }
    } catch (err) {
      console.error("Fetch clients error:", err);

      setClients([]);

      setError(
        err.response?.data?.message ||
          "Failed to load clients."
      );
    }
  };

  // Fetch projects and clients
  const fetchData = async () => {
    setLoading(true);
    setError("");

    await Promise.all([
      fetchProjects(),
      fetchClients(),
    ]);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter projects
  const filteredProjects = useMemo(() => {
    const query = search.toLowerCase().trim();

    return projects.filter((project) => {
      const projectName = project.name || "";
      const description = project.description || "";
      const clientName = project.client?.name || "";

      const matchesSearch =
        projectName.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query) ||
        clientName.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

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
    setEditingProject(null);
    setFormData({ ...initialFormData });
    setFormError("");
    setShowForm(true);
  };

  // Open edit modal
  const openEditModal = (project) => {
    setEditingProject(project);

    setFormData({
      name: project.name || "",
      description: project.description || "",
      client:
        project.client?._id ||
        project.client ||
        "",
      budget: project.budget ?? "",
      status: project.status || "planning",
      startDate: project.startDate
        ? project.startDate.slice(0, 10)
        : "",
      dueDate: project.dueDate
        ? project.dueDate.slice(0, 10)
        : "",
    });

    setFormError("");
    setShowForm(true);
  };

  // Close modal
  const closeModal = () => {
    if (submitting) return;

    setShowForm(false);
    setEditingProject(null);
    setFormData({ ...initialFormData });
    setFormError("");
  };

  // Create / update project
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        client: formData.client,
        budget: Number(formData.budget),
        status: formData.status,
        startDate: formData.startDate || undefined,
        dueDate: formData.dueDate || undefined,
      };

      if (editingProject) {
        const response = await api.put(
          `/projects/${editingProject._id}`,
          payload
        );

        const updatedProject =
          response.data.project ||
          response.data;

        setProjects((current) =>
          current.map((project) =>
            project._id === editingProject._id
              ? updatedProject
              : project
          )
        );
      } else {
        const response = await api.post(
          "/projects",
          payload
        );

        const newProject =
          response.data.project ||
          response.data;

        setProjects((current) => [
          newProject,
          ...current,
        ]);
      }

      closeModal();
    } catch (err) {
      console.error("Save project error:", err);

      setFormError(
        err.response?.data?.message ||
          "Failed to save project."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete project
  const handleDelete = async (projectId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/projects/${projectId}`);

      setProjects((current) =>
        current.filter(
          (project) => project._id !== projectId
        )
      );
    } catch (err) {
      console.error("Delete project error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to delete project."
      );
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Loading projects...
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
            Projects
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your freelance projects and deadlines.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          + Add Project
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        >
          <option value="all">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="in-progress">
            In Progress
          </option>
          <option value="completed">
            Completed
          </option>
          <option value="cancelled">
            Cancelled
          </option>
        </select>
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-lg font-semibold text-slate-900">
            No projects found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {projects.length === 0
              ? "Create your first project to get started."
              : "Try changing your search or status filter."}
          </p>

          {projects.length === 0 && (
            <button
              onClick={openCreateModal}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Project
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Client
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Budget
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
                {filteredProjects.map((project) => (
                  <tr
                    key={project._id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {project.name}
                        </p>

                        {project.description && (
                          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {project.client?.name ||
                        "Unknown client"}
                    </td>

                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatCurrency(project.budget)}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusStyles[
                            project.status
                          ] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {statusLabels[
                          project.status
                        ] || project.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {project.dueDate
                        ? new Date(
                            project.dueDate
                          ).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            openEditModal(project)
                          }
                          className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(
                              project._id
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
                  {editingProject
                    ? "Edit Project"
                    : "Add Project"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingProject
                    ? "Update your project details."
                    : "Create a new freelance project."}
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

              {/* Project Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Project Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Company Website Redesign"
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
                  placeholder="Describe the project..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Client + Budget */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Client
                  </label>

                  <select
                    name="client"
                    value={formData.client}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">
                      Select a client
                    </option>

                    {clients.map((client) => (
                      <option
                        key={client._id}
                        value={client._id}
                      >
                        {client.name}
                      </option>
                    ))}
                  </select>

                  {clients.length === 0 && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      Create a client before creating
                      a project.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Budget (NGN)
                  </label>

                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="150000"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              {/* Status */}
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
                  <option value="planning">
                    Planning
                  </option>

                  <option value="in-progress">
                    In Progress
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>
                </select>
              </div>

              {/* Dates */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Start Date
                  </label>

                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

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
                    clients.length === 0
                  }
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Saving..."
                    : editingProject
                    ? "Update Project"
                    : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;