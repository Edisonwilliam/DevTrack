import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Clients", path: "/clients" },
    { name: "Projects", path: "/projects" },
    { name: "Tasks", path: "/tasks" },
    { name: "Invoices", path: "/invoices" },
    { name: "Payments", path: "/payments" },
  ];

  if (user?.role === "admin") {
    links.push({
      name: "Admin",
      path: "/admin",
    });
  }

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate("/login");
  };

  const handleNavigation = () => {
    onClose?.();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-64 flex-col
          border-r border-slate-200 bg-white
          transition-transform duration-300 ease-in-out
          md:static md:z-auto md:min-h-screen md:translate-x-0
          ${
            isOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Dev<span className="text-indigo-600">Track</span>
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Freelancer workspace
            </p>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            aria-label="Close navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={handleNavigation}
              className={({ isActive }) =>
                `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-3">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user?.name}
            </p>

            <p className="truncate text-xs text-slate-500">
              {user?.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
