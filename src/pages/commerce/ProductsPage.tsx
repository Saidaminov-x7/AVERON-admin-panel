import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import { CountryFlag } from "../../components/commerce/CountryFlag";
import { Pagination, Select } from "../../components/ui";
import {
  createManualProduct,
  getProductCategories,
  getProductCountryDisplay,
  getProducts,
  isProductCountry,
  PRODUCT_COUNTRIES,
  updateManualProduct,
  type ProductCountry,
  type ProductListItem,
  type ProductPayload,
  type ProductUpdatePayload,
} from "../../lib/commerceApi";
import { deleteUnattachedMediaApi, uploadProductPhotoApi } from "../../lib/mediaApi";
import { getSiteSettingsApi } from "../../lib/siteSettingsApi";
import { ProductFormModal, type ProductFormSubmission } from "./ProductFormModal";

const ALL_COUNTRIES = "ALL" as const;

export default function ProductsPage() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [country, setCountry] = useState<ProductCountry | typeof ALL_COUNTRIES>(ALL_COUNTRIES);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["commerce-products", country, page, limit],
    queryFn: () => getProducts({
      country: country === ALL_COUNTRIES ? undefined : country,
      page,
      limit,
    }),
  });
  const categoriesQuery = useQuery({
    queryKey: ["commerce-product-categories"],
    queryFn: getProductCategories,
    enabled: isFormOpen,
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
        };

        if (productId) {
          const payload: ProductUpdatePayload = {
            ...sharedFields,
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
    onSuccess: (_result, variables) => {
      setSubmissionError(null);
      toast.success(t(variables.productId ? "products.productUpdated" : "products.done"));
      closeForm();
      void qc.invalidateQueries({ queryKey: ["commerce-products"] });
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

  const closeForm = () => {
    setSubmissionError(null);
    setIsFormOpen(false);
    setEditingProduct(null);
  };

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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-widest text-primary-500">{t("products.sectionLabel")}</p>
          <h1 className="truncate text-2xl font-black">{t("products.catalog")}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingProduct(null);
            setIsFormOpen(true);
          }}
          className="btn-primary shrink-0"
        >
          <Plus size={18} />
          {t("products.add")}
        </button>
      </div>

      <div className="mt-4 w-full max-w-sm">
        <Select
          label={t("products.countryFilterLabel")}
          placeholder={t("products.countryPlaceholder")}
          value={country}
          options={countryOptions}
          onChange={(value) => {
            setCountry(value === ALL_COUNTRIES ? ALL_COUNTRIES : isProductCountry(value) ? value : ALL_COUNTRIES);
            setPage(1);
          }}
        />
      </div>

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
              <article className="card overflow-hidden p-0" key={product.id}>
                <div className="flex h-48 items-center justify-center bg-stone-100 dark:bg-stone-800">
                  {product.images?.[0]?.url ? (
                    <img
                      src={product.images[0].url}
                      alt={title}
                      className="h-full w-full object-cover"
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
                </div>
                <div className="p-4">
                  <h2 className="font-bold">{title}</h2>
                  <p className="mt-1 text-sm text-muted">{getCountryLabel(product.country)}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <strong>{Number(product.salePriceUzs).toLocaleString()} UZS</strong>
                    <span className={product.status === "PUBLISHED" ? "badge-success" : product.status === "DRAFT" ? "badge-warning" : "badge-neutral"}>
                      {t(`products.status.${product.status.toLowerCase()}`)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(product);
                      setIsFormOpen(true);
                    }}
                    className="btn-ghost mt-3 inline-flex items-center gap-2 text-sm"
                  >
                    <Pencil size={14} />
                    {t("products.editProduct")}
                  </button>
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

      {isFormOpen && (
        <ProductFormModal
          isOpen={isFormOpen}
          product={editingProduct}
          categories={categoriesQuery.data ?? []}
          categoriesError={categoriesQuery.isError}
          maxProductPhotos={settingsQuery.data?.maxProductPhotos ?? 15}
          maxProductPhotoSizeMb={settingsQuery.data?.maxProductPhotoSizeMb ?? 10}
          settingsLoading={settingsQuery.isLoading}
          isSaving={mutation.isPending}
          submissionError={submissionError}
          onClose={closeForm}
          onSubmit={handleFormSubmit}
        />
      )}
    </Layout>
  );
}
