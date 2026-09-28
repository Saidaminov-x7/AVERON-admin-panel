import type { ComponentType } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
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
type Item = { to: string; key: string; icon: ComponentType<{ size?: number }> };
const sections = [
  { key: "command", items: [{ to: "/", key: "dashboard", icon: Gauge }] },
  {
    key: "products",
    items: [
      { to: "/imports", key: "review", icon: ClipboardCheck },
      { to: "/products", key: "catalog", icon: ShoppingBag },
      { to: "/media", key: "media", icon: Images },
    ],
  },
  {
    key: "operations",
    items: [
      { to: "/orders", key: "orders", icon: PackageCheck },
      { to: "/finance", key: "finance", icon: ReceiptText },
    ],
  },
  {
    key: "management",
    items: [
      { to: "/users", key: "users", icon: Users },
      { to: "/audit-log", key: "audit", icon: ShieldCheck },
      { to: "/settings/general", key: "settings", icon: Settings },
      { to: "/system/health", key: "health", icon: HeartHandshake },
    ],
  },
] as const;
const words = {
  ru: {
    command: "COMMAND CENTER",
    products: "ТОВАРЫ",
    operations: "ОПЕРАЦИИ",
    management: "УПРАВЛЕНИЕ",
    dashboard: "Обзор бизнеса",
    review: "Ожидают проверки",
    catalog: "Каталог товаров",
    media: "Медиа-библиотека",
    orders: "Заказы",
    finance: "Финансы и прибыль",
    users: "Пользователи",
    audit: "Журнал действий",
    settings: "Настройки",
    health: "Состояние системы",
    admin: "Администратор",
    logout: "Выйти",
  },
  uz: {
    command: "BOSHQARUV MARKAZI",
    products: "MAHSULOTLAR",
    operations: "OPERATSIYALAR",
    management: "BOSHQARUV",
    dashboard: "Biznes sharhi",
    review: "Tekshiruv kutilmoqda",
    catalog: "Mahsulotlar katalogi",
    media: "Media kutubxona",
    orders: "Buyurtmalar",
    finance: "Moliya va foyda",
    users: "Foydalanuvchilar",
    audit: "Harakatlar jurnali",
    settings: "Sozlamalar",
    health: "Tizim holati",
    admin: "Administrator",
    logout: "Chiqish",
  },
  en: {
    command: "COMMAND CENTER",
    products: "PRODUCTS",
    operations: "OPERATIONS",
    management: "MANAGEMENT",
    dashboard: "Business overview",
    review: "Pending review",
    catalog: "Product catalog",
    media: "Media library",
    orders: "Orders",
    finance: "Finance and profit",
    users: "Users",
    audit: "Audit log",
    settings: "Settings",
    health: "System health",
    admin: "Administrator",
    logout: "Sign out",
  },
} as const;
export default function Sidebar({
  onCloseMobile,
}: {
  onCloseMobile?: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const w = words[i18n.language?.slice(0, 2) as keyof typeof words] ?? words.ru;
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
          <div key={s.key}>
            <p className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-muted">
              {w[s.key]}
            </p>
            <div className="space-y-1">
              {s.items.map(({ to, key, icon: Icon }: Item) => (
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
                  <span>{w[key as keyof typeof w]}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-app p-4">
        <div className="mb-3 rounded-xl bg-violet-500/10 p-3">
          <p className="text-sm font-bold">{user?.name || w.admin}</p>
          <p className="text-xs text-muted">{user?.adminRole || "ADMIN"}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-red-500/10 hover:text-red-500"
        >
          <LogOut size={17} />
          {w.logout}
        </button>
      </div>
    </aside>
  );
}
