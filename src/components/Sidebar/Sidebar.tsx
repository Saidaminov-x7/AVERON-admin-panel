import type { ComponentType } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart2,
  ClipboardCheck,
  Gauge,
  HeartHandshake,
  Images,
  LogOut,
  PackageCheck,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { logoutApi } from "../../lib/authApi";
import { useAuthStore } from "../../store/authStore";

type Item = { to: string; labelKey: string; icon: ComponentType<{ size?: number }> };

const sections: { sectionKey: string; items: Item[] }[] = [
  {
    sectionKey: "sidebar.section.command",
    items: [{ to: "/", labelKey: "sidebar.dashboard", icon: Gauge }],
  },
  {
    sectionKey: "sidebar.section.products",
    items: [
      { to: "/imports", labelKey: "sidebar.review", icon: ClipboardCheck },
      { to: "/products", labelKey: "sidebar.catalog", icon: ShoppingBag },
      { to: "/media", labelKey: "sidebar.media", icon: Images },
    ],
  },
  {
    sectionKey: "sidebar.section.operations",
    items: [
      { to: "/orders", labelKey: "sidebar.orders", icon: PackageCheck },
      { to: "/finance", labelKey: "sidebar.finance", icon: ReceiptText },
    ],
  },
  {
    sectionKey: "sidebar.section.management",
    items: [
      { to: "/users", labelKey: "sidebar.users", icon: Users },
      { to: "/analytics", labelKey: "sidebar.analytics", icon: BarChart2 },
      { to: "/audit-log", labelKey: "sidebar.audit", icon: ShieldCheck },
      { to: "/error-logs", labelKey: "sidebar.errorLogs", icon: AlertCircle },
      { to: "/settings/general", labelKey: "sidebar.settings", icon: Settings },
      { to: "/system/health", labelKey: "sidebar.health", icon: HeartHandshake },
    ],
  },
];

export default function Sidebar({
  onCloseMobile,
}: {
  onCloseMobile?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      useAuthStore.getState().logout();
      navigate("/login");
    }
  };

  return (
    <aside className="sidebar-bg safe-top safe-bottom flex h-dvh w-72 flex-col border-r sidebar-border text-app shadow-[18px_0_50px_rgba(15,23,42,.08)] lg:shadow-none">
      <div className="flex h-20 items-center justify-between border-b border-app px-6">
        <button onClick={() => navigate("/")} className="text-left">
          <div className="text-xl font-black tracking-[.2em]">AVERON</div>
          <div className="text-[10px] font-bold tracking-[.24em] text-violet-500">
            COMMAND CENTER
          </div>
        </button>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="lg:hidden">
            <X />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {sections.map((s) => (
          <div key={s.sectionKey}>
            <p className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-muted">
              {t(s.sectionKey)}
            </p>
            <div className="space-y-1">
              {s.items.map(({ to, labelKey, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-[transform,background-color,color,box-shadow] duration-150 [transition-timing-function:var(--ease-out-ui)] active:scale-[.98] ${isActive ? "bg-violet-600 text-white shadow-[0_8px_24px_rgba(124,58,237,.22)]" : "text-app hover:bg-violet-500/10"}`
                  }
                >
                  <Icon size={18} />
                  <span>{t(labelKey)}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-app p-4">
        <div className="mb-3 rounded-xl bg-violet-500/10 p-3">
          <p className="text-sm font-bold">{user?.name || t("sidebar.admin")}</p>
          <p className="text-xs text-muted">{user?.adminRole || "ADMIN"}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={17} />
          {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );
}
