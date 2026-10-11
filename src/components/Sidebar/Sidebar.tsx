import type { ComponentType, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Activity,
  BarChart2,
  Bell,
  Check,
  ChevronDown,
  ClipboardCheck,
  Gauge,
  ExternalLink,
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
import { Dropdown } from "../Dropdown";

type Item = { to: string; labelKey: string; icon: ComponentType<{ size?: number }> };

const LANGUAGE_NAMES = {
  ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
  uz: "Oʻzbekcha",
  en: "English",
} as const;

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

let rememberedNavigationScroll = 0;

function readPreference(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function savePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Keep the current session functional when browser storage is unavailable.
  }
}

export default function Sidebar({
  onCloseMobile,
  onDesktopWidthChange,
  isMobileOpen = false,
}: {
  onCloseMobile?: () => void;
  onDesktopWidthChange?: (width: number) => void;
  isMobileOpen?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const siteUrl = import.meta.env.VITE_SITE_URL || "https://averon.uz";
  const navRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState(() => readPreference("averon-admin-sidebar-collapsed") === "true");
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  const [width, setWidth] = useState(() => {
    const stored = Number(readPreference("averon-admin-sidebar-width"));
    return Number.isFinite(stored) ? Math.min(360, Math.max(220, stored)) : 256;
  });
  const compact = collapsed && isDesktop;

  useEffect(() => {
    onDesktopWidthChange?.(compact ? 76 : width);
  }, [compact, onDesktopWidthChange, width]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsDesktop(media.matches);
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
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
        // The in-memory position still survives route changes.
      }
    };
    nav.addEventListener("scroll", rememberScroll, { passive: true });
    return () => {
      rememberScroll();
      nav.removeEventListener("scroll", rememberScroll);
    };
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    savePreference("averon-admin-sidebar-collapsed", String(next));
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (compact) return;
    event.preventDefault();
    document.documentElement.classList.add("admin-sidebar-resizing");
    let nextWidth = width;
    const move = (pointerEvent: PointerEvent) => {
      nextWidth = Math.min(360, Math.max(220, pointerEvent.clientX));
      setWidth(nextWidth);
    };
    const finish = () => {
      setWidth(nextWidth);
      savePreference("averon-admin-sidebar-width", String(nextWidth));
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
    const step = event.shiftKey ? 25 : 10;
    const nextWidth = event.key === "Home"
      ? 220
      : event.key === "End"
        ? 360
        : Math.min(360, Math.max(220, width + (event.key === "ArrowRight" ? step : -step)));
    setWidth(nextWidth);
    savePreference("averon-admin-sidebar-width", String(nextWidth));
  };

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
      style={{ "--admin-sidebar-width": `${compact ? 76 : width}px` } as CSSProperties}
      className={`admin-sidebar sidebar-bg safe-top safe-bottom relative flex h-dvh w-full max-w-full shrink-0 flex-col overflow-hidden text-app transition-[width] duration-200 lg:max-w-none lg:border-r lg:sidebar-border ${compact ? "is-collapsed" : ""}`}
    >
      <div className={`sticky top-0 z-20 flex h-16 shrink-0 items-center border-b border-app bg-surface ${compact ? "justify-start px-4" : "justify-between px-5 pr-5 lg:pr-14"}`}>
        <div className="mx-auto flex w-full max-w-xl items-center justify-between">
          <div role="img" aria-label={t("header.adminPanel")} className={`text-left ${compact ? "min-h-11 min-w-8 px-1" : ""}`}>
            <div className="flex items-center gap-2 text-base font-black tracking-[.2em]">{compact ? "A" : "AVERON"}</div>
            {!compact && <div className="mt-1 text-[9px] font-bold tracking-[.18em] text-muted">ADMIN</div>}
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              data-action-id="admin.sidebar.close-mobile-navigation"
              aria-label={t("common.close", "Закрыть")}
              className="flex size-10 items-center justify-center rounded-lg border border-app bg-surface text-app transition-colors hover:bg-app lg:hidden"
            >
              <X />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          data-action-id="admin.sidebar.toggle-collapse"
          aria-pressed={compact}
          title={t(collapsed ? "common.expand" : "common.collapse")}
          aria-label={t(collapsed ? "common.expand" : "common.collapse")}
          className="absolute right-1 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-lg border border-app bg-surface text-muted shadow-sm transition-colors hover:bg-app hover:text-app lg:flex"
        >
          {compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>
      <nav id="admin-desktop-navigation" ref={navRef} className={`admin-sidebar-nav mx-auto min-h-0 w-full max-w-xl flex-1 space-y-5 overflow-y-auto overscroll-contain py-5 lg:space-y-6 lg:py-6 ${compact ? "px-2" : "px-4"}`}>
        {sections.map((s) => (
          <div key={s.sectionKey}>
            <p className={`mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-muted ${compact ? "sr-only" : ""}`}>
              {t(s.sectionKey)}
            </p>
            <div className="space-y-1">
              {s.items.map(({ to, labelKey, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={onCloseMobile}
                  title={compact ? t(labelKey) : undefined}
                  className={({ isActive }) =>
                    `admin-drawer-link flex min-h-11 items-center gap-3 border-b border-app px-1 py-2 text-sm font-semibold transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out-ui)] active:scale-[.98] lg:min-h-11 lg:rounded lg:border-0 lg:px-3 ${isActive ? "is-active bg-primary-600 text-[var(--color-on-primary)]" : "text-app hover:bg-primary-500/10"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-primary-500/10" : "text-muted"}`}><Icon size={18} /></span>
                      {!compact && <span>{t(labelKey)}</span>}
                      {isActive && <span className="admin-drawer-active-indicator ml-auto h-5 w-1 shrink-0 rounded-full bg-primary-500 lg:hidden" aria-hidden="true" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div data-admin-mobile-utilities="" className="mx-auto w-full max-w-xl shrink-0 space-y-2 border-t border-app bg-surface px-5 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted">{t("common.language", "Язык")}</p>
          <div className="flex min-w-0 items-center gap-2">
        <Dropdown
          key={`admin-mobile-language-${isMobileOpen ? "open" : "closed"}`}
          portal
          className="min-w-0"
          contentClassName="w-[min(15rem,calc(100vw-2.5rem))] p-1.5"
          trigger={(
            <span className="flex h-11 items-center justify-between gap-2 rounded-lg border border-app bg-surface px-2.5 text-sm font-semibold text-app transition-colors hover:bg-[var(--color-surface-soft)]">
              <span className="flex min-w-0 items-center gap-2">
                <LanguageFlag locale={i18n.language.startsWith("uz") ? "uz" : i18n.language.startsWith("en") ? "en" : "ru"} />
                <span className="truncate">{i18n.language.startsWith("uz") ? "Oʻzbekcha" : i18n.language.startsWith("en") ? "English" : "Русский"}</span>
              </span>
              <ChevronDown size={16} className="shrink-0 text-muted" />
            </span>
          )}
        >
          {([
            { code: "ru", label: "Русский" },
            { code: "uz", label: "Oʻzbekcha" },
            { code: "en", label: "English" },
          ] as const).map(({ code }) => {
            const label = LANGUAGE_NAMES[code];
            const active = i18n.language.slice(0, 2) === code;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                data-action-id={`admin.sidebar.language.${code}`}
                onClick={() => {
                  void i18n.changeLanguage(code);
                  try { localStorage.setItem("i18nextLng", code); } catch { /* keep the selected locale for this session */ }
                }}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${active ? "bg-[var(--color-surface-soft)] font-semibold text-app" : "text-app hover:bg-[var(--color-surface-soft)]"}`}
              >
                <span className="flex items-center gap-3"><LanguageFlag locale={code} />{label}</span>
                {active && <Check size={16} className="text-primary-500" />}
              </button>
            );
          })}
        </Dropdown>
            <ThemeToggle />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <NavLink to="/notifications" onClick={onCloseMobile} className="flex min-h-10 items-center gap-2 border-b border-app px-1 text-sm font-semibold text-app">
            <Bell size={17} />
            <span>{t("header.notifications")}</span>
          </NavLink>
          <NavLink to="/profile" onClick={onCloseMobile} className="flex min-h-10 items-center gap-2 border-b border-app px-1 text-sm font-semibold text-app">
            <UserRound size={17} />
            <span>{t("header.account")}</span>
          </NavLink>
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" onClick={onCloseMobile} className="col-span-2 flex min-h-10 items-center gap-2 border-b border-app px-1 text-sm font-semibold text-app">
            <ExternalLink size={17} />
            <span>{t("header.goToSite")}</span>
          </a>
        </div>
      </div>
      <div data-admin-drawer-footer="" className={`mx-auto w-full max-w-xl shrink-0 border-t border-app ${compact ? "p-2" : "p-3 lg:p-4"}`}>
        {!compact && <div className="min-w-0 px-1 py-1 lg:mb-2 lg:py-2">
          <p className="text-sm font-bold">{user?.name || t("sidebar.admin")}</p>
          <p className="text-xs text-muted">{user?.adminRole || "ADMIN"}</p>
        </div>}
        <button
          type="button"
          onClick={logout}
          aria-label={t("sidebar.logout")}
          title={compact ? t("sidebar.logout") : undefined}
          className="flex min-h-10 w-full items-center gap-2 rounded px-1 py-2 text-sm text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 lg:px-3"
        >
          <LogOut size={17} />
          {!compact && t("sidebar.logout")}
        </button>
      </div>
      {!compact && <div
        role="separator"
        data-action-id="admin.sidebar.resize"
        aria-orientation="vertical"
        aria-label={t("common.resizeSidebar")}
        aria-valuemin={220}
        aria-valuemax={360}
        aria-valuenow={width}
        title={t("common.resizeSidebarHint")}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={resizeWithKeyboard}
        className="absolute inset-y-0 right-0 z-10 hidden w-1 cursor-col-resize bg-transparent hover:bg-primary-500/30 focus-visible:outline-none focus-visible:bg-primary-500/40 lg:block"
      />}
    </aside>
  );
}
