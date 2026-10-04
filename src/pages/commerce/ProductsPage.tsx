import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ImageOff, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { CountryFlag } from "../../components/commerce/CountryFlag";
import { Pagination, Select } from "../../components/ui";
import {
  createManualProduct,
  archiveProduct,
  deleteProductPermanently,
  restoreProduct,
  getProductCategories,
  getProductCountryDisplay,
  getProducts,
  isProductCountry,
  publishProductToTelegram,
  PRODUCT_COUNTRIES,
  updateManualProduct,
  type ProductCountry,
  type ProductListItem,
  type ProductPayload,
  type ProductSource,
  type ProductUpdatePayload,
} from "../../lib/commerceApi";
import { deleteUnattachedMediaApi, uploadProductPhotoApi } from "../../lib/mediaApi";
import { getSiteSettingsApi } from "../../lib/siteSettingsApi";
import { ProductFormModal, type ProductFormSubmission } from "./ProductFormModal";

const ALL_COUNTRIES = "ALL" as const;

export default function ProductsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { identifier } = useParams<{ identifier: string }>();
  const isEditorRoute = location.pathname === "/products/new" || Boolean(identifier);
  const isNewProductRoute = location.pathname === "/products/new";
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [country, setCountry] = useState<ProductCountry | typeof ALL_COUNTRIES>(ALL_COUNTRIES);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState(() => searchParams.get("category") ?? "");
  const [status, setStatus] = useState<ProductListItem["status"] | "ALL">("ALL");
  const [source, setSource] = useState<ProductSource | "ALL">("ALL");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [telegramPublishError, setTelegramPublishError] = useState<string | null>(null);
  const [telegramRetryProductId, setTelegramRetryProductId] = useState<string | null>(null);
  const [isRetryingTelegram, setIsRetryingTelegram] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["commerce-products", country, categorySlug, status, source, sort, search, page, limit],
    queryFn: () => getProducts({
      country: country === ALL_COUNTRIES ? undefined : country,
      category: categorySlug || undefined,
      status: status === "ALL" ? undefined : status,
      source: source === "ALL" ? undefined : source,
      sort,
      q: search || undefined,
      page,
      limit,
    }),
  });
  const editorProductQuery = useQuery({
    queryKey: ["commerce-product-editor", identifier],
    queryFn: () => getProducts({ q: identifier, limit: 5 }),
    enabled: Boolean(identifier),
    retry: false,
  });
  const categoriesQuery = useQuery({
    queryKey: ["commerce-product-categories"],
    queryFn: getProductCategories,
  });
  const settingsQuery = useQuery({
    queryKey: ["admin", "site-settings"],
    queryFn: getSiteSettingsApi,
    enabled: isFormOpen,
  });

  const mutation = useMutation({
    mutationFn: async ({ productId, values }: { productId: string | null; values: ProductFormSubmission }) => {
      const uploadedIds: string[] = [];
      try {
        const images: Array<{ id: string } | { mediaId: string }> = [];
        for (const image of values.images) {
          if ("id" in image) {
            images.push({ id: image.id });
          } else if ("mediaId" in image) {
            images.push({ mediaId: image.mediaId });
          } else {
            const uploaded = await uploadProductPhotoApi(image.file);
            if (uploaded.isNewUpload) uploadedIds.push(uploaded.id);
            images.push({ mediaId: uploaded.id });
          }
        }

        const sharedFields = {
          title: values.title,
          titleUz: values.titleUz,
          titleEn: values.titleEn,
          description: values.description,
          descriptionUz: values.descriptionUz,
          descriptionEn: values.descriptionEn,
          ...(values.sourceUrl ? { sourceUrl: values.sourceUrl } : {}),
          images,
          salePriceUzs: values.salePriceUzs,
          compareAtPriceUzs: values.compareAtPriceUzs,
          colors: values.colors,
          sizeChartType: values.sizeChartType || null,
        };

        if (productId) {
          const payload: ProductUpdatePayload = {
            ...sharedFields,
            publish: values.publish,
            ...(isProductCountry(values.country) ? { country: values.country } : {}),
            categoryId: values.categoryId ?? null,
            ...(editingProduct?.source === "MANUAL"
              ? { color: values.color, size: values.size }
              : {}),
          };
          return await updateManualProduct(productId, payload);
        }

        if (!isProductCountry(values.country)) {
          throw new Error("A supported product country is required");
        }
        const payload: ProductPayload = {
          ...sharedFields,
          country: values.country,
          images: images.map((image) => {
            if (!("mediaId" in image)) throw new Error("New products require uploaded photo references");
            return { mediaId: image.mediaId };
          }),
          categoryId: values.categoryId || undefined,
          color: values.color,
          size: values.size,
          publish: values.publish,
        };
        return await createManualProduct(payload);
      } catch (error) {
        await Promise.allSettled(uploadedIds.map((id) => deleteUnattachedMediaApi(id)));
        throw error;
      }
    },
    onSuccess: async (result, variables) => {
      setSubmissionError(null);
      toast.success(t(variables.productId ? "products.productUpdated" : "products.done"));
      void qc.invalidateQueries({ queryKey: ["commerce-products"] });
      if (variables.values.publishTelegram) {
        if (!result?.id) {
          setTelegramPublishError(t("products.telegram.savedButFailed"));
          return;
        }
        setEditingProduct(result);
        setTelegramRetryProductId(result.id);
        await retryTelegramPublication(result.id);
      } else {
        closeForm();
      }
    },
    onError: (error: unknown) => {
      const responseError = error as {
        response?: {
          status?: number;
          data?: { message?: unknown; requestId?: unknown };
        };
      };
      const { status, data: response } = responseError.response ?? {};
      const message = status !== undefined && status < 500 && typeof response?.message === "string"
        ? response.message
        : t("products.serverError");
      const requestId = status !== undefined && status >= 500 && typeof response?.requestId === "string"
        ? ` (${response.requestId})`
        : "";
      setSubmissionError(`${message}${requestId}`);
      toast.error(`${message}${requestId}`);
    },
  });
  const archiveMutation = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      toast.success("Товар перемещён в архив");
      void qc.invalidateQueries({ queryKey: ["commerce-products"] });
    },
    onError: () => toast.error("Не удалось архивировать товар"),
  });
  const restoreMutation = useMutation({
    mutationFn: restoreProduct,
    onSuccess: () => {
      toast.success("Товар восстановлен как черновик");
      void qc.invalidateQueries({ queryKey: ["commerce-products"] });
    },
    onError: () => toast.error("Не удалось восстановить товар"),
  });
  const permanentDeleteMutation = useMutation({
    mutationFn: deleteProductPermanently,
    onSuccess: () => {
      toast.success("Товар удалён навсегда");
      void qc.invalidateQueries({ queryKey: ["commerce-products"] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || "Не удалось удалить товар навсегда");
    },
  });

  const closeForm = () => {
    setSubmissionError(null);
    setTelegramPublishError(null);
    setTelegramRetryProductId(null);
    setIsFormOpen(false);
    setEditingProduct(null);
    if (isEditorRoute) navigate("/products");
  };

  const retryTelegramPublication = async (productId: string) => {
    setIsRetryingTelegram(true);
    try {
      await publishProductToTelegram(productId);
      setTelegramPublishError(null);
      setTelegramRetryProductId(null);
      toast.success(t("products.telegram.published"));
      closeForm();
    } catch {
      setTelegramPublishError(t("products.telegram.failedAfterSave"));
      toast.error(t("products.telegram.publishError"));
    } finally {
      setIsRetryingTelegram(false);
    }
  };

  useEffect(() => {
    if (!isEditorRoute) {
      setIsFormOpen(false);
      setEditingProduct(null);
      return;
    }
    if (isNewProductRoute) {
      setEditingProduct(null);
      setIsFormOpen(true);
      return;
    }
    if (!identifier || editorProductQuery.isLoading) return;
    const match = editorProductQuery.data?.items.find((product) =>
      product.slug === identifier || product.id === identifier,
    );
    if (match) {
      setEditingProduct(match);
      setIsFormOpen(true);
    }
  }, [editorProductQuery.data, editorProductQuery.isLoading, identifier, isEditorRoute, isNewProductRoute]);

  const handleFormSubmit = (values: ProductFormSubmission) => {
    setSubmissionError(null);
    mutation.mutate({ productId: editingProduct?.id ?? null, values });
  };

  const products = data?.items ?? [];
  const countryOptions = [
    { value: ALL_COUNTRIES, label: `🌍 ${t("products.allCountries")}` },
    ...PRODUCT_COUNTRIES.map(({ code, translationKey }) => ({
      value: code,
      label: t(translationKey),
      icon: <CountryFlag country={code} />,
    })),
  ];
  const categoryOptions = [
    { value: "", label: t("categories.all") },
    ...(categoriesQuery.data ?? []).filter((category) => category.active !== false).map((category) => ({
      value: category.slug,
      label: typeof category.name === "string" ? category.name : category.name.ru || category.name.en || category.slug,
    })),
  ];
  const statusOptions = [
    { value: "ALL", label: t("products.allStatuses") },
    { value: "PUBLISHED", label: t("products.status.published") },
    { value: "DRAFT", label: t("products.status.draft") },
    { value: "ARCHIVED", label: t("products.status.archived") },
  ];
  const sortOptions = [
    { value: "newest", label: t("products.sortNewest") },
    { value: "price_asc", label: t("products.sortPriceAsc") },
    { value: "price_desc", label: t("products.sortPriceDesc") },
  ];
  const sourceOptions = [
    { value: "ALL", label: t("products.allSources") },
    ...(["SOURCE_1688", "TAOBAO", "ALIBABA", "ALIEXPRESS", "MANUAL"] as const).map((value) => ({
      value,
      label: t(`products.source.${value}`),
    })),
  ];
  const pageSizeOptions = [15, 30, 48].map((size) => ({ value: String(size), label: String(size) }));
  const getCountryLabel = (productCountry: string) => {
    const knownCountry = PRODUCT_COUNTRIES.find(({ code }) => code === productCountry);
    if (knownCountry) {
      return <span className="inline-flex items-center gap-2"><CountryFlag country={knownCountry.code} />{t(knownCountry.translationKey)}</span>;
    }
    const display = getProductCountryDisplay(productCountry);
    return `${display.flag} ${t(display.translationKey, display.code ? { code: display.code } : undefined)}`;
  };

  return (
    <Layout title={t("products.page")}>
      {!isEditorRoute && <>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-widest text-primary-500">{t("products.sectionLabel")}</p>
          <h1 className="truncate text-2xl font-black">{t("products.catalog")}</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate("/products/new")}
          className="btn-primary shrink-0"
        >
          <Plus size={18} />
          {t("products.add")}
        </button>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-app bg-surface p-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-8">
        <form
          className="flex min-w-0 items-end gap-2 xl:col-span-2"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchDraft.trim());
            setPage(1);
          }}
        >
          <label className="min-w-0 flex-1 text-xs font-semibold text-muted">
            {t("products.searchProducts")}
            <input className="input mt-1.5 w-full" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} />
          </label>
          <button type="submit" className="btn-primary h-10">{t("common.search")}</button>
        </form>
        <Select
          label={t("products.countryFilterLabel")}
          value={country}
          options={countryOptions}
          onChange={(value) => {
            setCountry(value === ALL_COUNTRIES ? ALL_COUNTRIES : isProductCountry(value) ? value : ALL_COUNTRIES);
            setPage(1);
          }}
        />
        <Select
          label={t("products.categoryFilter")}
          value={categorySlug}
          options={categoryOptions}
          onChange={(value) => { setCategorySlug(value); setPage(1); }}
        />
        <Select
          label={t("products.statusFilter")}
          value={status}
          options={statusOptions}
          onChange={(value) => {
            setStatus(value === "PUBLISHED" || value === "DRAFT" || value === "ARCHIVED" ? value : "ALL");
            setPage(1);
          }}
        />
        <Select
          label={t("products.sortLabel")}
          value={sort}
          options={sortOptions}
          onChange={(value) => {
            setSort(value === "price_asc" || value === "price_desc" ? value : "newest");
            setPage(1);
          }}
        />
        <Select
          label={t("products.sourceFilter")}
          value={source}
          options={sourceOptions}
          onChange={(value) => {
            setSource(value === "SOURCE_1688" || value === "TAOBAO" || value === "ALIBABA" || value === "ALIEXPRESS" || value === "MANUAL" ? value : "ALL");
            setPage(1);
          }}
        />
        <Select
          label={t("products.pageSize")}
          value={String(limit)}
          options={pageSizeOptions}
          onChange={(value) => {
            const nextLimit = Number(value);
            setLimit(nextLimit === 15 || nextLimit === 30 || nextLimit === 48 ? nextLimit : 15);
            setPage(1);
          }}
        />
      </div>

      <div className="mt-4">
      {isLoading ? (
        <div className="card">{t("products.loading")}</div>
      ) : isError && !data ? (
        <div className="card flex flex-wrap items-center justify-between gap-3 text-muted">
          <p>{t("products.loadError")}</p>
          <button type="button" onClick={() => void refetch()} className="btn-ghost">
            {t("common.refresh")}
          </button>
        </div>
      ) : products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const russianTranslation = product.translations?.ru;
            const title = typeof russianTranslation === "string"
              ? russianTranslation
              : russianTranslation?.title || product.slug;
            return (
              <article className="group overflow-hidden rounded-xl border border-app bg-surface transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary-500/40 hover:shadow-lg" key={product.id}>
                <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-stone-100 dark:bg-stone-800">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted">
                      <ImageOff size={24} />
                      <span className="text-xs">AVERON</span>
                    </div>
                  )}
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${product.status === "PUBLISHED" ? "bg-emerald-600 text-white" : product.status === "DRAFT" ? "bg-amber-400 text-stone-950" : "bg-stone-900 text-white"}`}>
                    {t(`products.status.${product.status.toLowerCase()}`)}
                  </span>
                </div>
                <div className="p-4">
                  {product.variants?.some((variant) => variant.color?.includes("::")) ? (
                    <div className="mb-3 flex items-center gap-1.5">
                      {product.variants.filter((variant) => variant.color?.includes("::")).slice(0, 6).map((variant) => {
                        const [name, hex] = variant.color!.split("::");
                        return <span key={variant.id} title={name} className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: hex }} />;
                      })}
                      {product.variants.filter((variant) => variant.color?.includes("::")).length > 6 ? <span className="text-[11px] text-muted">+{product.variants.filter((variant) => variant.color?.includes("::")).length - 6}</span> : null}
                    </div>
                  ) : null}
                  <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted">{getCountryLabel(product.country)}</p>
                  <h2 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5">{title}</h2>
                  <p className="mt-1 text-xs text-muted">{product.category
                    ? (typeof product.category.name === "string" ? product.category.name : product.category.name.ru || product.category.name.en || product.category.slug)
                    : t("products.uncategorized")}</p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <strong className="text-base tabular-nums">{Number(product.salePriceUzs).toLocaleString()} UZS</strong>
                    {product.compareAtPriceUzs && Number(product.compareAtPriceUzs) > Number(product.salePriceUzs) ? <span className="text-xs tabular-nums text-muted line-through">{Number(product.compareAtPriceUzs).toLocaleString()} UZS</span> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                    <span>{t("products.providerLabel")}: {t(`products.source.${product.source}`, { defaultValue: product.source })}</span>
                    <span>{product.variants?.some((variant) => variant.available !== false && (variant.stock === undefined || variant.stock > 0))
                      ? t("products.inStock")
                      : t("products.outOfStock")}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-app pt-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/products/edit/${encodeURIComponent(product.slug)}`)}
                      className="btn-ghost inline-flex items-center gap-2 text-sm"
                    >
                      <Pencil size={14} />
                      {t("products.editProduct")}
                    </button>
                    {product.status === "ARCHIVED" ? (
                      <button type="button" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(product.id)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-app px-3 text-xs font-semibold hover:bg-app disabled:opacity-50"><RotateCcw size={14} />Восстановить</button>
                    ) : (
                      <button type="button" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate(product.id)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-app px-3 text-xs font-semibold hover:bg-app disabled:opacity-50"><Archive size={14} />В архив</button>
                    )}
                    <button type="button" disabled={permanentDeleteMutation.isPending} onClick={() => {
                      if (window.confirm(`Удалить «${title}» навсегда? Это действие нельзя отменить.`)) permanentDeleteMutation.mutate(product.id);
                    }} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-50" aria-label={`Удалить ${title} навсегда`}><Trash2 size={15} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card text-muted">{t("products.emptyAll")}</div>
      )}

      {data?.pagination && (
        <Pagination
          currentPage={page}
          totalPages={data.pagination.pages}
          totalItems={data.pagination.total}
          pageSize={limit}
          pageSizeOptions={[15, 30, 48]}
          onPageChange={setPage}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
      )}
      </div>
      </>}

      {isEditorRoute && identifier && editorProductQuery.isLoading ? (
        <div className="card" role="status">
          {t("products.loading")}
        </div>
      ) : null}
      {isEditorRoute && identifier && editorProductQuery.isError ? (
        <div className="card flex flex-wrap items-center justify-between gap-3" role="alert">
          <div className="card">{t("products.loadError")} <button type="button" onClick={() => navigate("/products")} className="btn-ghost">{t("common.back")}</button></div>
        </div>
      ) : null}
      {isFormOpen && (
        <ProductFormModal
          isOpen={isFormOpen}
          presentation={isEditorRoute ? "page" : "dialog"}
          product={editingProduct}
          categories={categoriesQuery.data ?? []}
          categoriesError={categoriesQuery.isError}
          maxProductPhotos={settingsQuery.data?.maxProductPhotos ?? 15}
          maxProductPhotoSizeMb={settingsQuery.data?.maxProductPhotoSizeMb ?? 10}
          settingsLoading={settingsQuery.isLoading}
          isSaving={mutation.isPending}
          submissionError={submissionError}
          telegramPublishError={telegramPublishError}
          isRetryingTelegram={isRetryingTelegram}
          onRetryTelegram={() => {
            if (telegramRetryProductId) void retryTelegramPublication(telegramRetryProductId);
          }}
          onClose={closeForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </Layout>
  );
}
