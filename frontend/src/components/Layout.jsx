import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const businessLinks = [
    { to: "/dashboard/inventory", label: "Inventory", eyebrow: "01" },
    { to: "/dashboard/listings", label: "Surplus Listings", eyebrow: "02" },
    { to: "/dashboard/analytics", label: "Impact", eyebrow: "03" },
  ];
  const ngoLinks = [
    { to: "/dashboard/browse", label: "Available Surplus", eyebrow: "01" },
    { to: "/dashboard/pickups", label: "My Pickups", eyebrow: "02" },
    { to: "/dashboard/analytics", label: "Impact", eyebrow: "03" },
  ];
  const links = user?.role === "business" ? businessLinks : ngoLinks;

  return (
    <div className="min-h-screen flex bg-wheat-50">
      <aside className="w-64 shrink-0 bg-forest-800 text-wheat-100 flex flex-col">
        <div className="px-6 py-7 border-b border-forest-600/60">
          <p className="font-display italic text-2xl leading-tight">Harvest&nbsp;Ledger</p>
          <p className="text-xs uppercase tracking-widest text-forest-100/60 mt-1">
            Surplus &amp; Redistribution
          </p>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-forest-600 text-white"
                    : "text-wheat-100/80 hover:bg-forest-600/40"
                }`
              }
            >
              <span className="font-mono text-xs text-forest-100/40">{l.eyebrow}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-6 py-5 border-t border-forest-600/60">
          <p className="text-sm font-medium truncate">{user?.org_name}</p>
          <p className="text-xs text-wheat-100/50 capitalize mb-3">{user?.role} account</p>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="text-xs uppercase tracking-wide text-tomato-400 hover:text-tomato-500"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
