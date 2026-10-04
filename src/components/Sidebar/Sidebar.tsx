import type { ComponentType } from "react";
import { useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Activity,
  BarChart2,
  Bell,
  ClipboardCheck,
  Gauge,
  HeartHandshake,
  Images,
  LogOut,
  MessageSquareText,
  PackageCheck,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { logoutApi } from "../../lib/authApi";
import { useAuthStore } from "../../store/authStore";
import { LanguageFlag } from "../ui/LanguageFlag";

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
      { to: "/categories", labelKey: "sidebar.categories", icon: Tags },
      { to: "/media", labelKey: "sidebar.media", icon: Images },
      { to: "/reviews", labelKey: "sidebar.reviews", icon: MessageSquareText },
    ],
  },
  {
    sectionKey: "sidebar.section.operations",
    items: [
      { to: "/orders", labelKey: "sidebar.orders", icon: PackageCheck },
      { to: "/finance", labelKey: "sidebar.finance", icon: ReceiptText },
      { to: "/commerce/promo-codes", labelKey: "sidebar.commercePromos", icon: Tags },
    ],
  },
  {
    sectionKey: "sidebar.section.management",
    items: [
      { to: "/users", labelKey: "sidebar.users", icon: Users },
      { to: "/analytics", labelKey: "sidebar.analytics", icon: BarChart2 },
      { to: "/audit-log", labelKey: "sidebar.audit", icon: ShieldCheck },
      { to: "/visual-search/audit", labelKey: "sidebar.visualSearchAudit", icon: Search },
      { to: "/notifications", labelKey: "sidebar.notifications", icon: Bell },
      { to: "/error-logs", labelKey: "sidebar.errorLogs", icon: AlertCircle },
      { to: "/settings/general", labelKey: "sidebar.settings", icon: Settings },
      { to: "/system/health", labelKey: "sidebar.health", icon: HeartHandshake },
      { to: "/system/integrations", labelKey: "sidebar.integrations", icon: Activity },
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
  const { t, i18n } = useTranslation();
  const siteUrl = import.meta.env.VITE_SITE_URL || "https://averon.uz";
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    try {
      nav.scrollTop = Number(sessionStorage.getItem("averon-admin-sidebar-scroll") || 0);
    } catch {
      // Keep the sidebar usable when storage is unavailable.
    }
    return () => {
      try {
        sessionStorage.setItem("averon-admin-sidebar-scroll", String(nav.scrollTop));
      } catch {
        // Scrolling still works when storage is unavailable.
      }
    };
  }, []);

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      useAuthStore.getState().logout();
      navigate("/login");
    }
  };

  return (
    <aside
      className="sidebar-bg safe-top safe-bottom flex h-dvh w-64 flex-col border-r sidebar-border text-app"
    >
      <div className="flex h-16 items-center justify-between border-b border-app px-5">
        <button onClick={() => navigate("/")} className="text-left">
          <div className="flex items-center gap-2 text-base font-black tracking-[.2em]">AVERON<span className="h-1.5 w-1.5 bg-primary-500" /></div>
          <div className="mt-1 text-[9px] font-bold tracking-[.18em] text-muted">ADMIN</div>
        </button>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t("common.close", "Закрыть")}
            className="lg:hidden"
          >
            <X />
          </button>
        )}
      </div>
      <nav ref={navRef} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-6">
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
                    `flex min-h-11 items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out-ui)] active:scale-[.98] ${isActive ? "bg-primary-600 text-white" : "text-app hover:bg-primary-500/10"}`
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
      <div className="space-y-3 border-t border-app p-4 lg:hidden">
        <p className="text-[10px] font-bold tracking-[.16em] text-muted">{t("header.language")}</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { code: "ru", label: "Русский" },
            { code: "uz", label: "O‘zbekcha" },
            { code: "en", label: "English" },
          ] as const).map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                void i18n.changeLanguage(code);
                localStorage.setItem("i18nextLng", code);
              }}
              aria-pressed={i18n.language.slice(0, 2) === code}
              aria-label={label}
              className={`min-h-10 rounded-lg border px-2 text-xs font-semibold ${i18n.language.slice(0, 2) === code ? "border-primary-500 bg-primary-500 text-white" : "border-app text-app"}`}
            >
              <LanguageFlag locale={code} />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <NavLink to="/notifications" onClick={onCloseMobile} className="text-sm font-semibold text-app">
            {t("header.notifications")}
          </NavLink>
          <ThemeToggle />
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" onClick={onCloseMobile} className="text-sm font-semibold text-primary-600">
            {t("header.goToSite")}
          </a>
        </div>
        <NavLink to="/profile" onClick={onCloseMobile} className="block min-h-10 py-2 text-sm font-semibold text-app">
          {t("header.account")}
        </NavLink>
      </div>
      <div className="border-t border-app p-4">
        <div className="mb-3 border border-app bg-primary-500/5 p-3">
          <p className="text-sm font-bold">{user?.name || t("sidebar.admin")}</p>
          <p className="text-xs text-muted">{user?.adminRole || "ADMIN"}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={17} />
          {t("sidebar.logout")}
        </button>
      </div>
    </aside>
  );
}
