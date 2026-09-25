import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();

  const getPageInfo = () => {
    const path = location.pathname;

    const pages = {
      "/dashboard": {
        title: "Dashboard",
        subtitle: "Manage your freelance business",
      },

      "/clients": {
        title: "Clients",
        subtitle: "Manage your client relationships",
      },

      "/projects": {
        title: "Projects",
        subtitle: "Manage your freelance projects",
      },

      "/tasks": {
        title: "Tasks",
        subtitle: "Track your project tasks",
      },

      "/invoices": {
        title: "Invoices",
        subtitle: "Create and manage invoices",
      },

      "/payments": {
        title: "Payments",
        subtitle: "Track your payment activity",
      },

      "/admin": {
        title: "Admin",
        subtitle: "Monitor the DevTrack platform",
      },
    };

    return (
      pages[path] || {
        title: "DevTrack",
        subtitle: "Freelancer project management",
      }
    );
  };

  const { title, subtitle } = getPageInfo();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      {/* Left side */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
          aria-label="Open navigation menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Page Information */}
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
            {title}
          </h2>

          <p className="hidden text-xs text-slate-500 sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      {/* User Information */}
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">
            {user?.name}
          </p>

          <p className="text-xs capitalize text-slate-500">
            {user?.role}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
          {user?.name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
