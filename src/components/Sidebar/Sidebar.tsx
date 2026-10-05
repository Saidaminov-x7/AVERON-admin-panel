import type { ComponentType, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Activity,
  BarChart2,
  Bell,
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
}: {
  onCloseMobile?: () => void;
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
      style={{ width: isDesktop ? (compact ? 76 : width) : undefined }}
      className="sidebar-bg safe-top safe-bottom relative flex h-dvh w-[min(92vw,380px)] max-w-full shrink-0 flex-col overflow-y-auto border-r sidebar-border text-app transition-[width] duration-200 lg:w-auto lg:overflow-hidden"
    >
      <div className={`sticky top-0 z-20 flex h-16 shrink-0 items-center border-b border-app bg-surface ${compact ? "justify-start px-4" : "justify-between px-5 pr-5 lg:pr-14"}`}>
        <button onClick={() => navigate("/")} className="text-left">
          <div className="flex items-center gap-2 text-base font-black tracking-[.2em]">{compact ? "A" : "AVERON"}<span className="h-1.5 w-1.5 bg-primary-500" /></div>
          {!compact && <div className="mt-1 text-[9px] font-bold tracking-[.18em] text-muted">ADMIN</div>}
        </button>
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"}
          className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-lg border border-app bg-surface text-muted shadow-sm transition-colors hover:bg-app hover:text-app lg:flex"
        >
          {compact ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t("common.close", "Закрыть")}
            className="flex size-10 items-center justify-center rounded-lg border border-app bg-surface text-app transition-colors hover:bg-app lg:hidden"
          >
            <X />
          </button>
        )}
      </div>
      <nav ref={navRef} className={`flex-none space-y-7 overflow-visible overscroll-contain py-6 lg:min-h-0 lg:flex-1 lg:space-y-6 lg:overflow-y-auto ${compact ? "px-2" : "px-4"}`}>
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
                    `flex min-h-11 items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out-ui)] active:scale-[.98] ${isActive ? "bg-primary-600 text-white" : "text-app hover:bg-primary-500/10"}`
                  }
                >
                  <Icon size={18} />
                  {!compact && <span>{t(labelKey)}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-4 border-t border-app bg-app/40 p-4 lg:hidden">
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted">{t("common.language", "Язык")}</p>
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
              className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-bold transition-colors ${i18n.language.slice(0, 2) === code ? "border-primary-600 bg-primary-600 text-white" : "border-app bg-surface text-app"}`}
            >
              <LanguageFlag locale={code} />
              <span>{code.toUpperCase()}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NavLink to="/notifications" onClick={onCloseMobile} className="flex min-h-12 items-center gap-3 rounded-lg border border-app bg-surface px-3 text-sm font-semibold text-app">
            <Bell size={17} />
            <span>{t("header.notifications")}</span>
          </NavLink>
          <div className="flex min-h-12 items-center gap-3 rounded-lg border border-app bg-surface px-2 text-sm font-semibold text-app">
            <ThemeToggle />
            <span>{t("header.darkTheme", "Тема")}</span>
          </div>
          <NavLink to="/profile" onClick={onCloseMobile} className="flex min-h-12 items-center gap-3 rounded-lg border border-app bg-surface px-3 text-sm font-semibold text-app">
            <UserRound size={17} />
            <span>{t("header.account")}</span>
          </NavLink>
          <a href={siteUrl} target="_blank" rel="noopener noreferrer" onClick={onCloseMobile} className="flex min-h-12 items-center gap-3 rounded-lg border border-app bg-surface px-3 text-sm font-semibold text-app">
            <ExternalLink size={17} />
            <span>{t("header.goToSite")}</span>
          </a>
        </div>
      </div>
      <div className={`border-t border-app ${compact ? "p-2" : "p-4"}`}>
        {!compact && <div className="mb-3 border border-app bg-primary-500/5 p-3">
          <p className="text-sm font-bold">{user?.name || t("sidebar.admin")}</p>
          <p className="text-xs text-muted">{user?.adminRole || "ADMIN"}</p>
        </div>}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-muted hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={17} />
          {!compact && t("sidebar.logout")}
        </button>
      </div>
      {!compact && <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Изменить ширину меню"
        aria-valuemin={220}
        aria-valuemax={360}
        aria-valuenow={width}
        title="Потяните, чтобы изменить ширину"
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={resizeWithKeyboard}
        className="absolute inset-y-0 -right-1 z-10 hidden w-2 cursor-col-resize bg-transparent hover:bg-primary-500/20 focus-visible:outline-none focus-visible:bg-primary-500/30 lg:block"
      />}
    </aside>
  );
}
