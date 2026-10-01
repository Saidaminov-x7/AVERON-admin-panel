import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { Button } from "../components/ui";
import {
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from "../lib/notificationsApi";

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const queryKey = ["admin", "notifications"];
  const notificationsQuery = useQuery({ queryKey, queryFn: getNotificationsApi });
  const markRead = useMutation({
    mutationFn: markNotificationReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error(t("header.notificationError")),
  });
  const markAll = useMutation({
    mutationFn: markAllNotificationsReadApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: () => toast.error(t("header.notificationError")),
  });
  const locale = i18n.language.startsWith("en") ? "en-US" : i18n.language.startsWith("uz") ? "uz-UZ" : "ru-RU";

  return (
    <Layout title={t("header.notifications")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">{t("header.notifications")}</h1>
        <Button
          variant="outline"
          leftIcon={<CheckCheck size={16} />}
          disabled={!notificationsQuery.data?.unreadCount || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          {t("header.markAllRead")}
        </Button>
      </div>
      {notificationsQuery.isLoading ? (
        <div className="card">{t("products.loading")}</div>
      ) : notificationsQuery.isError ? (
        <div role="alert" className="card text-red-500">{t("header.notificationError")}</div>
      ) : notificationsQuery.data?.items.length ? (
        <ul className="space-y-3">
          {notificationsQuery.data.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (!item.isRead) markRead.mutate(item.id);
                  if (item.link) navigate(item.link);
                }}
                className={`card flex w-full items-start gap-3 text-left transition-colors hover:border-primary-500/40 ${item.isRead ? "" : "border-primary-500/30 bg-primary-500/5"}`}
              >
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-primary-500"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-start justify-between gap-2">
                    <strong className="text-sm text-app">{item.title}</strong>
                    <time className="text-xs text-muted">{new Date(item.createdAt).toLocaleString(locale)}</time>
                  </span>
                  <span className="mt-1 block text-sm text-muted">{item.message}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card text-center text-muted">{t("header.noNotifications")}</div>
      )}
    </Layout>
  );
}
