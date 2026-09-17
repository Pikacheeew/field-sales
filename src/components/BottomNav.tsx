import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

const ICONS: Record<string, JSX.Element> = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.8-3.6 3-5.5 5.5-5.5s4.7 1.9 5.5 5.5" strokeLinecap="round" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M15.8 14.2c2.1.3 3.6 2 4.2 4.6" strokeLinecap="round" />
    </svg>
  ),
  plan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4M7 13h3M7 17h7" strokeLinecap="round" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  order: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M2.5 3h2.4l2 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 7H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M7 3h8l4 4v14H7z" strokeLinejoin="round" />
      <path d="M15 3v4h4M9 13h6M9 17h6" strokeLinecap="round" />
    </svg>
  )
};

export default function BottomNav() {
  const { user } = useAuth();
  const tabs = [
    { to: "/today", label: "Today", icon: "today" },
    { to: "/customers", label: "Customers", icon: "customers" },
    { to: "/plan", label: "Plan", icon: "plan" },
    { to: "/dashboard", label: "Dashboard", icon: "dashboard" }
    // Ordering tab hidden for now — route/page still exist, just not linked from nav.
  ];
  if (user?.role === "ops") tabs.push({ to: "/reports", label: "Reports", icon: "reports" });

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex z-30">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 tap-target ${
              isActive ? "text-brand-500" : "text-gray-400"
            }`
          }
        >
          {ICONS[t.icon]}
          <span className="text-[11px] font-medium">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
