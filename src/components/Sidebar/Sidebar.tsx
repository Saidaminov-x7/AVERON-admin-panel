import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BarChart2,
  Bell,
  ClipboardCheck,
  ExternalLink,
  Gauge,
  HeartHandshake,
  Images,
  LogOut,
  MessageSquareText,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import ThemeToggle from "../ThemeToggle/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { logoutApi } from "../../lib/authApi";
import { useAuthStore } from "../../store/authStore";
import { LanguageFlag } from "../ui/LanguageFlag";

type NavIcon = ComponentType<{ size?: number; strokeWidth?: number }>;
type NavItem = { to: string; labelKey: string; icon: NavIcon };
type NavSection = { titleKey: string; items: NavItem[] };

let rememberedNavigationScroll = 0;

const sections: NavSection[] = [
  { titleKey: "sidebar.section.command", items: [{ to: "/", labelKey: "sidebar.dashboard", icon: Gauge }] },
  {
    titleKey: "sidebar.section.products",
    items: [
      { to: "/imports", labelKey: "sidebar.review", icon: ClipboardCheck },
      { to: "/products", labelKey: "sidebar.catalog", icon: ShoppingBag },
      { to: "/categories", labelKey: "sidebar.categories", icon: Tags },
      { to: "/media", labelKey: "sidebar.media", icon: Images },
      { to: "/reviews", labelKey: "sidebar.reviews", icon: MessageSquareText },
    ],
  },
  {
    titleKey: "sidebar.section.operations",
    items: [
      { to: "/orders", labelKey: "sidebar.orders", icon: PackageCheck },
      { to: "/finance", labelKey: "sidebar.finance", icon: ReceiptText },
      { to: "/commerce/promo-codes", labelKey: "sidebar.commercePromos", icon: Tags },
    ],
  },
  {
    titleKey: "sidebar.section.management",
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

const languages = [
  { code: "ru", name: "Русский" },
  { code: "uz", name: "O‘zbekcha" },
  { code: "en", name: "English" },
] as const;

function readCollapsedPreference() {
  try {
    return localStorage.getItem("averon-admin-sidebar-collapsed") === "true";
  } catch {
    return false;
  }
}

function readSidebarWidth() {
  try {
    const stored = Number(localStorage.getItem("averon-admin-sidebar-width"));
    return Number.isFinite(stored) ? Math.min(320, Math.max(232, stored)) : 256;
  } catch {
    return 256;
  }
}

export default function Sidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const [width, setWidth] = useState(readSidebarWidth);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  const navRef = useRef<HTMLElement>(null);
  const siteUrl = import.meta.env.VITE_SITE_URL || "https://averon.uz";

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    try {
      const storedScroll = Number(sessionStorage.getItem("averon-admin-sidebar-scroll"));
      nav.scrollTop = Number.isFinite(storedScroll) ? storedScroll : rememberedNavigationScroll;
    } catch {
      nav.scrollTop = rememberedNavigationScroll;
    }
    const rememberScroll = () => {
      rememberedNavigationScroll = nav.scrollTop;
      try {
        sessionStorage.setItem("averon-admin-sidebar-scroll", String(nav.scrollTop));
      } catch {
        // Keep the current scroll position in memory when browser storage is unavailable.
      }
    };
    nav.addEventListener("scroll", rememberScroll, { passive: true });
    return () => {
      rememberScroll();
      nav.removeEventListener("scroll", rememberScroll);
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("averon-admin-sidebar-collapsed", String(next));
      } catch {
        // Sidebar remains usable for this session when browser storage is unavailable.
      }
      return next;
    });
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDesktop || collapsed) return;
    event.preventDefault();
    document.documentElement.classList.add("admin-sidebar-resizing");
    let nextWidth = width;
    const move = (pointerEvent: PointerEvent) => {
          const pageRect = document.querySelector(".averon-admin-shell")?.getBoundingClientRect();
          nextWidth = Math.min(320, Math.max(232, pointerEvent.clientX - (pageRect?.left ?? 0)));
      setWidth(nextWidth);
    };
    const finish = () => {
      setWidth(nextWidth);
      try {
        localStorage.setItem("averon-admin-sidebar-width", String(nextWidth));
      } catch {
        // Width remains adjustable for the current session.
      }
      document.documentElement.classList.remove("admin-sidebar-resizing");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  };

  const resizeWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 24 : 10;
    const nextWidth = event.key === "Home"
      ? 232
      : event.key === "End"
        ? 320
        : Math.min(320, Math.max(232, width + (event.key === "ArrowRight" ? step : -step)));
    setWidth(nextWidth);
    try {
      localStorage.setItem("averon-admin-sidebar-width", String(nextWidth));
    } catch {
      // Width remains adjustable for the current session.
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      useAuthStore.getState().logout();
      navigate("/login");
    }
  };

  const changeLanguage = (code: (typeof languages)[number]["code"]) => {
    void i18n.changeLanguage(code);
    try {
      localStorage.setItem("i18nextLng", code);
    } catch {
      // The selected language still changes in the active session.
    }
  };

  return (
    <aside
      style={{ width: isDesktop ? (collapsed ? 76 : width) : undefined }}
      className={`sidebar-bg safe-top safe-bottom admin-sidebar relative flex h-dvh w-screen max-w-full shrink-0 flex-col overflow-hidden text-app transition-[width] duration-200 lg:w-auto lg:border-r lg:sidebar-border ${collapsed ? "is-collapsed" : ""}`}
      aria-label={t("header.mobileNavigation")}
    >
      <div className="admin-sidebar-brand sticky top-0 z-20 flex h-[72px] shrink-0 items-center justify-between border-b border-app bg-surface px-5">
        <button type="button" onClick={() => { navigate("/"); onCloseMobile?.(); }} className="text-left" aria-label="AVERON — обзор">
          <span className="flex items-center gap-2 text-base font-black tracking-[.2em]">
            <span className={collapsed ? "hidden lg:inline" : ""}>AVERON</span>
            <span className={collapsed ? "lg:hidden" : "hidden"}>A</span>
            <span className="h-1.5 w-1.5 bg-primary-500" aria-hidden="true" />
          </span>
          {!collapsed && <span className="mt-1 block text-[9px] font-bold tracking-[.18em] text-muted">ADMIN</span>}
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          title={t(collapsed ? "common.expand" : "common.collapse")}
          aria-label={t(collapsed ? "common.expand" : "common.collapse")}
          className="admin-sidebar-collapse hidden size-9 items-center justify-center border border-app bg-surface text-muted transition-colors hover:bg-app hover:text-app lg:flex"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t("common.close")}
            className="flex size-10 items-center justify-center border border-app bg-surface text-app transition-colors hover:bg-app lg:hidden"
          >
            <X size={19} />
          </button>
        )}
      </div>
      <nav ref={navRef} className="admin-sidebar-nav min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-5" aria-label={t("header.mobileNavigation")}>
        {sections.map(({ titleKey, items }) => (
          <section key={titleKey} aria-label={t(titleKey)}>
            <h2 className={`admin-sidebar-section-title mb-2 px-3 text-[10px] font-bold tracking-[.12em] text-muted ${collapsed ? "lg:sr-only" : ""}`}>
              {t(titleKey)}
            </h2>
            <div className="space-y-1">
              {items.map(({ to, labelKey, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={onCloseMobile}
                  title={collapsed ? t(labelKey) : undefined}
                  aria-label={t(labelKey)}
                  className={({ isActive }) => `admin-drawer-link flex min-h-11 items-center gap-3 px-3 py-2 text-sm transition-colors ${isActive ? "is-active" : ""}`}
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span className="admin-sidebar-label truncate">{t(labelKey)}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="admin-sidebar-mobile-tools space-y-3 border-t border-app bg-surface px-4 py-4 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-muted">{t("common.language")}</span>
          <ThemeToggle />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {languages.map(({ code, name }) => (
            <button
              key={code}
              type="button"
              onClick={() => changeLanguage(code)}
              aria-label={name}
              aria-pressed={i18n.language.slice(0, 2) === code}
              className={`flex min-h-10 items-center justify-center gap-2 border px-2 text-xs font-semibold transition-colors ${i18n.language.slice(0, 2) === code ? "border-current text-app" : "border-app text-muted"}`}
            >
              <LanguageFlag locale={code} />
              <span>{code.toUpperCase()}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NavLink to="/notifications" onClick={onCloseMobile} className="flex min-h-11 items-center gap-2 border-b border-app px-1 text-sm font-medium text-app">
            <Bell size={17} />{t("header.notifications")}
          </NavLink>
          <NavLink to="/profile" onClick={onCloseMobile} className="flex min-h-11 items-center gap-2 border-b border-app px-1 text-sm font-medium text-app">
            <UserRound size={17} />{t("header.account")}
          </NavLink>
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" onClick={onCloseMobile} className="col-span-2 flex min-h-11 items-center gap-2 border-b border-app px-1 text-sm font-medium text-app">
            <ExternalLink size={17} />{t("header.goToSite")}
          </a>
        </div>
      </div>

      <div className="admin-sidebar-account flex shrink-0 items-center gap-3 border-t border-app px-4 py-3">
        <div className="admin-account-avatar flex size-9 shrink-0 items-center justify-center bg-app text-xs font-bold text-app" aria-hidden="true">
          {(user?.name || "A").slice(0, 1).toUpperCase()}
        </div>
        <div className={`admin-sidebar-account-details min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="truncate text-sm font-semibold">{user?.name || t("sidebar.admin")}</p>
            <p className="truncate text-xs text-muted">{user?.adminRole || "ADMIN"}</p>
        </div>
        <button type="button" onClick={logout} className="admin-logout flex size-9 shrink-0 items-center justify-center text-muted transition-colors hover:bg-red-500/10 hover:text-red-600" aria-label={t("sidebar.logout")} title={t("sidebar.logout")}>
          <LogOut size={17} />
        </button>
      </div>
      {!collapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("sidebar.resize", "Изменить ширину меню")}
          aria-valuemin={232}
          aria-valuemax={320}
          aria-valuenow={width}
          tabIndex={0}
          onPointerDown={startResize}
          onKeyDown={resizeWithKeyboard}
          className="admin-sidebar-resizer absolute inset-y-0 -right-1 z-10 hidden w-2 cursor-col-resize bg-transparent hover:bg-primary-500/20 focus-visible:bg-primary-500/30 lg:block"
        />
      )}
    </aside>
  );
}
