import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/axios";

type PublicationStatus = "NOT_PUBLISHED" | "PUBLISHING" | "PUBLISHED" | "FAILED";

interface Publication {
  featureEnabled: boolean;
  configured: boolean;
  channelId: string | null;
  status: PublicationStatus;
  telegramMessageId: string | null;
  publishedAt: string | null;
  lastAttemptAt: string | null;
  errorCode: string | null;
  attemptCount: number;
  captionOverride: string;
}

interface TelegramPreview {
  title: string;
  description: string;
  priceUzs: string;
  availability: "IN_STOCK" | "LOW_STOCK" | "PREORDER" | "OUT_OF_STOCK";
  estimatedAvailableAt: string | null;
  imageUrl: string | null;
  productUrl: string;
  captionText: string;
  buttonText: string;
  channelId: string | null;
}

function formatDate(value: string | null, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU");
}

function telegramFailureReason(error: unknown): string | null {
  const data = (error as { response?: { data?: { details?: unknown; code?: unknown } } }).response?.data;
  if (typeof data?.details === "string") return data.details;
  return typeof data?.code === "string" ? data.code : null;
}

export function TelegramPublicationPanel({
  productId,
  locale,
}: {
  productId: string;
  locale: string;
}) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [captionOverride, setCaptionOverride] = useState<string | null>(null);
  const [preview, setPreview] = useState<TelegramPreview | null>(null);
  const queryClient = useQueryClient();
  const queryKey = ["telegram-publication", productId];
  const statusQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get<Publication>(`/api/v1/admin/products/${encodeURIComponent(productId)}/telegram-publication`);
      return response.data;
    },
  });
  const publication = statusQuery.data;
  const effectiveCaptionOverride = captionOverride ?? publication?.captionOverride ?? "";
  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<TelegramPreview>(
        `/api/v1/admin/products/${encodeURIComponent(productId)}/telegram-preview`,
        effectiveCaptionOverride.trim() ? { captionOverride: effectiveCaptionOverride.trim() } : {},
      );
      return response.data;
    },
    onSuccess: (result) => setPreview(result),
  });
  const publishMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ status: PublicationStatus; telegramMessageId: string; publishedAt: string; attemptCount: number }>(
        `/api/v1/admin/products/${encodeURIComponent(productId)}/telegram-publish`,
        effectiveCaptionOverride.trim() ? { captionOverride: effectiveCaptionOverride.trim() } : {},
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const statusKey = publication?.status ?? "NOT_PUBLISHED";

  return (
    <section className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/20" aria-label={t("products.telegram.title")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-bold">{t("products.telegram.title")}</h3>
          {statusQuery.isLoading ? (
            <p role="status" className="mt-1 text-xs text-muted">{t("products.telegram.loading")}</p>
          ) : statusQuery.isError ? (
            <p role="alert" className="mt-1 text-xs text-red-600">{t("products.telegram.statusError")}</p>
          ) : (
            <p className="mt-1 text-xs text-muted">{t(`products.telegram.status.${statusKey}`)}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          aria-expanded={isExpanded}
          className="btn-ghost inline-flex min-h-10 items-center gap-2 text-sm"
        >
          <Eye size={15} />{t("products.telegram.preview")}
        </button>
      </div>

      {publication?.publishedAt && (
        <p className="mt-2 text-xs text-muted">
          {t("products.telegram.publishedAt", { date: formatDate(publication.publishedAt, locale) })}
        </p>
      )}
      {publication?.channelId && (
        <p className="mt-1 break-all text-xs text-muted">
          {t("products.telegram.channel")}: {publication.channelId}
        </p>
      )}
      {publication?.telegramMessageId && (
        <p className="mt-1 break-all text-xs text-muted">
          {t("products.telegram.messageId")}: {publication.telegramMessageId}
        </p>
      )}
      {publication?.status === "FAILED" && (
        <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">
          {t(publication.errorCode === "TELEGRAM_DELIVERY_UNCONFIRMED"
            ? "products.telegram.deliveryUnconfirmed"
            : "products.telegram.publishError")}
        </p>
      )}
      {publication && !publication.featureEnabled && (
        <p className="mt-2 text-xs text-muted">{t("products.telegram.featureDisabled")}</p>
      )}
      {publication?.featureEnabled && !publication.configured && (
        <p className="mt-2 text-xs text-muted">{t("products.telegram.notConfigured")}</p>
      )}

      {isExpanded && (
        <div className="mt-3 space-y-3 border-t border-sky-200 pt-3 dark:border-sky-900">
          <label className="block text-xs font-semibold" htmlFor={`telegram-caption-${productId}`}>
            {t("products.telegram.captionLabel")}
            <textarea
              id={`telegram-caption-${productId}`}
              value={effectiveCaptionOverride}
              maxLength={700}
              rows={3}
              onChange={(event) => {
                setCaptionOverride(event.target.value);
                setPreview(null);
              }}
              placeholder={t("products.telegram.captionPlaceholder")}
              className="mt-1 block w-full resize-y rounded-lg border border-stone-300 bg-white p-2 text-sm font-normal text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/20 dark:bg-stone-900 dark:text-white"
            />
          </label>
          <p className="text-xs text-muted">{t("products.telegram.canonicalDataHint")}</p>
          <button
            type="button"
            onClick={() => previewMutation.mutate()}
            disabled={previewMutation.isPending || statusQuery.isLoading || statusQuery.isError}
            className="btn-secondary inline-flex min-h-10 items-center gap-2 text-sm"
          >
            <Eye size={15} />{previewMutation.isPending ? t("products.telegram.previewLoading") : t("products.telegram.preview")}
          </button>
          {previewMutation.isError && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("products.telegram.previewError")}</p>
          )}
          {preview && (
            <article className="max-w-md overflow-hidden rounded-xl border border-stone-200 bg-white text-stone-900 dark:border-white/10">
              {preview.imageUrl && <img src={preview.imageUrl} alt={preview.title} className="max-h-72 w-full object-cover" />}
              <div className="space-y-2 p-3">
                <h4 className="font-bold">{preview.title}</h4>
                <p className="whitespace-pre-wrap break-words text-sm">{preview.captionText}</p>
                <a href={preview.productUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-sky-600 px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
                  {preview.buttonText}
                </a>
              </div>
            </article>
          )}
          <button
            type="button"
            onClick={() => publishMutation.mutate()}
            disabled={
              !publication?.featureEnabled ||
              !publication.configured ||
              publication.status === "PUBLISHED" ||
              publication.status === "PUBLISHING" ||
              publication.errorCode === "TELEGRAM_DELIVERY_UNCONFIRMED" ||
              !preview ||
              statusQuery.isLoading ||
              statusQuery.isError ||
              publishMutation.isPending
            }
            className="btn-primary inline-flex min-h-11 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} />
            {publishMutation.isPending
              ? t("products.telegram.publishing")
              : publication?.status === "FAILED"
                ? t("products.telegram.retry")
                : t("products.telegram.publish")}
          </button>
          {publishMutation.isError && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {t("products.telegram.publishError")}
              {telegramFailureReason(publishMutation.error) ? ` (${telegramFailureReason(publishMutation.error)})` : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
