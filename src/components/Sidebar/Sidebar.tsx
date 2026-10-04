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
      style={{ width: compact ? 76 : isDesktop ? width : 256 }}
      className="sidebar-bg safe-top safe-bottom relative flex h-dvh shrink-0 flex-col border-r sidebar-border text-app transition-[width] duration-200"
    >
      <div className={`flex h-16 items-center border-b border-app ${compact ? "justify-center px-2" : "justify-between px-5"}`}>
        <button onClick={() => navigate("/")} className="text-left">
          <div className="flex items-center gap-2 text-base font-black tracking-[.2em]">{compact ? "A" : "AVERON"}<span className="h-1.5 w-1.5 bg-primary-500" /></div>
          {!compact && <div className="mt-1 text-[9px] font-bold tracking-[.18em] text-muted">ADMIN</div>}
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
      <nav ref={navRef} className={`min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain py-6 ${compact ? "px-2" : "px-4"}`}>
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
      <button type="button" onClick={toggleCollapsed} title={collapsed ? "Развернуть меню" : "Свернуть меню"} aria-label={collapsed ? "Развернуть меню" : "Свернуть меню"} className="absolute -right-4 bottom-20 z-10 hidden h-8 w-8 items-center justify-center border border-app bg-surface text-muted shadow-sm hover:text-app lg:flex">
        {compact ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
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
