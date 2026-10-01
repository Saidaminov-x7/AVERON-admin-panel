import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImageOff, LoaderCircle, Pencil, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import { Button, Modal, Pagination, Select } from "../../components/ui";
import {
  createManualProduct,
  getProducts,
  isProductCountry,
  PRODUCT_COUNTRIES,
  updateProductCountry,
  type ProductListItem,
  type ProductCountry,
} from "../../lib/commerceApi";
import { uploadMediaApi } from "../../lib/mediaApi";

export default function ProductsPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<ProductCountry | "">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [editingProduct, setEditingProduct] = useState<ProductListItem | null>(null);
  const [editingCountry, setEditingCountry] = useState<ProductCountry | "">("");
  const [imageUrl, setImageUrl] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["commerce-products", country, page, limit],
    queryFn: () => getProducts({ country: country || undefined, page, limit }),
  });

  const mutation = useMutation({
    mutationFn: async (formData: {
      title: string;
      country: ProductCountry;
      titleUz: string;
      titleEn: string;
      description: string;
      sourceUrl: string;
      imageUrlOrFile: string | File | undefined;
      sourcePriceCny: number;
      exchangeRate: number;
      salePriceUzs: number;
      color: string;
      size: string;
      publish: boolean;
    }) => {
      let finalImageUrl = typeof formData.imageUrlOrFile === "string"
        ? formData.imageUrlOrFile
        : undefined;

      // Upload file only at submit time
      if (formData.imageUrlOrFile instanceof File) {
        const uploaded = await uploadMediaApi(formData.imageUrlOrFile);
        finalImageUrl = uploaded.url;
      }

      return createManualProduct({
        title: formData.title,
        country: formData.country,
        titleUz: formData.titleUz,
        titleEn: formData.titleEn,
        description: formData.description,
        sourceUrl: formData.sourceUrl,
        imageUrl: finalImageUrl,
        sourcePriceCny: formData.sourcePriceCny,
        exchangeRate: formData.exchangeRate,
        salePriceUzs: formData.salePriceUzs,
        color: formData.color,
        size: formData.size,
        publish: formData.publish,
      });
    },
    onSuccess: () => {
      toast.success(t("products.done"));
      closeForm();
      qc.invalidateQueries({ queryKey: ["commerce-products"] });
    },
    onError: () => toast.error(t("products.createError")),
  });

  const countryMutation = useMutation({
    mutationFn: ({ id, country: selectedCountry }: { id: string; country: ProductCountry }) =>
      updateProductCountry(id, selectedCountry),
    onSuccess: () => {
      toast.success(t("products.countryUpdated"));
      setEditingProduct(null);
      setEditingCountry("");
      qc.invalidateQueries({ queryKey: ["commerce-products"] });
    },
    onError: () => toast.error(t("products.countryUpdateError")),
  });

  const closeForm = () => {
    setOpen(false);
    setImageUrl("");
    setLocalPreview(null);
    setLocalFile(null);
    setImageError(false);
  };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const selectedCountry = f.get("country");
    if (!isProductCountry(selectedCountry)) {
      toast.error(t("products.countryRequired"));
      return;
    }
    mutation.mutate({
      title: String(f.get("title")),
      country: selectedCountry,
      titleUz: String(f.get("titleUz") || ""),
      titleEn: String(f.get("titleEn") || ""),
      description: String(f.get("description") || ""),
      sourceUrl: String(f.get("sourceUrl")),
      imageUrlOrFile: localFile ?? (imageUrl || undefined),
      sourcePriceCny: Number(f.get("sourcePriceCny")),
      exchangeRate: Number(f.get("exchangeRate")),
      salePriceUzs: Number(f.get("salePriceUzs")),
      color: String(f.get("color") || ""),
      size: String(f.get("size") || ""),
      publish: f.get("publish") === "on",
    });
  };

  const handleFileSelect = (file: File) => {
    setLocalFile(file);
    setImageUrl("");
    setImageError(false);
    const reader = new FileReader();
    reader.onload = (ev) => setLocalPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const previewSrc = localPreview || imageUrl;

  const products = data?.items ?? [];
  const countryOptions = [
    { value: "", label: `🌍 ${t("products.allCountries")}` },
    ...PRODUCT_COUNTRIES.map(({ code, flag, translationKey }) => ({
      value: code,
      label: `${flag} ${t(translationKey)}`,
    })),
  ];
  const editableCountryOptions = PRODUCT_COUNTRIES.map(({ code, flag, translationKey }) => ({
    value: code,
    label: `${flag} ${t(translationKey)}`,
  }));
  const getCountryLabel = (selectedCountry: ProductCountry) => {
    const option = PRODUCT_COUNTRIES.find(({ code }) => code === selectedCountry);
    return option ? `${option.flag} ${t(option.translationKey)}` : selectedCountry;
  };
  const field = "input";

  return (
    <Layout title={t("products.page")}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-violet-500">
            CATALOG
          </p>
          <h1 className="text-2xl font-black">{t("products.catalog")}</h1>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus size={18} />
          {t("products.add")}
        </button>
      </div>

      <div className="mt-4 max-w-sm">
        <Select
          label={t("products.countryFilterLabel")}
          value={country}
          options={countryOptions}
          onChange={(value) => {
            setCountry(isProductCountry(value) ? value : "");
            setPage(1);
          }}
        />
      </div>

      {open && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t("products.add")}</h2>
            <button onClick={closeForm}>
              <X />
            </button>
          </div>
          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              {t("products.titleLabel")}
              <input required name="title" className={field} />
            </label>
            <label>
              {t("products.titleUzLabel")}
              <input name="titleUz" className={field} />
            </label>
            <label>
              {t("products.titleEnLabel")}
              <input name="titleEn" className={field} />
            </label>
            <label>
              {t("products.sourceLabel")}
              <input required type="url" name="sourceUrl" className={field} />
            </label>
            <label>
              {t("products.countryLabel")}
              <select required name="country" defaultValue="CN" className={field}>
                {PRODUCT_COUNTRIES.map(({ code, flag, translationKey }) => (
                  <option key={code} value={code}>
                    {flag} {t(translationKey)}
                  </option>
                ))}
              </select>
            </label>

            {/* Фото-блок: preview + URL ввод + выбор файла */}
            <div className="md:col-span-2 rounded-xl border border-app p-4">
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                  {previewSrc && !imageError ? (
                    <img
                      src={previewSrc}
                      alt={t("products.page")}
                      className="h-full w-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted">
                      <ImageOff size={24} />
                      <span className="text-xs">{t("products.noImage")}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <label className="block">
                    {t("products.imageLabel")}
                    <input
                      type="url"
                      name="imageUrl"
                      value={imageUrl}
                      onChange={(ev) => {
                        setImageUrl(ev.target.value);
                        setLocalFile(null);
                        setLocalPreview(null);
                        setImageError(false);
                      }}
                      className={field}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="btn-ghost w-fit border border-app cursor-pointer">
                    <Upload size={17} />
                    {t("products.uploadBtn")}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      className="sr-only"
                      onChange={(ev) => {
                        const file = ev.target.files?.[0];
                        if (file) handleFileSelect(file);
                        ev.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {localFile && (
                    <p className="text-xs text-violet-500 font-medium">
                      📎 {localFile.name}
                    </p>
                  )}
                  <p className="text-xs text-muted">{t("products.uploadHint")}</p>
                </div>
              </div>
            </div>

            <label>
              {t("products.costLabel")}
              <input
                required
                min="0"
                step="0.01"
                type="number"
                name="sourcePriceCny"
                className={field}
              />
            </label>
            <label>
              {t("products.rateLabel")}
              <input
                required
                min="1"
                step="0.01"
                type="number"
                name="exchangeRate"
                className={field}
              />
            </label>
            <label>
              {t("products.priceLabel")}
              <input
                required
                min="1"
                type="number"
                name="salePriceUzs"
                className={field}
              />
            </label>
            <label>
              {t("products.colorLabel")}
              <input name="color" className={field} />
            </label>
            <label>
              {t("products.sizeLabel")}
              <input name="size" className={field} />
            </label>
            <label className="md:col-span-2">
              {t("products.descLabel")}
              <textarea name="description" className={`${field} min-h-24`} />
            </label>
            <label className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" name="publish" defaultChecked />
              {t("products.publishLabel")}
            </label>
            <div className="flex gap-3 md:col-span-2">
              <button
                disabled={mutation.isPending}
                className="btn-primary"
              >
                {mutation.isPending && (
                  <LoaderCircle size={17} className="animate-spin" />
                )}
                {mutation.isPending ? t("products.creating") : t("products.saveBtn")}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="btn-ghost"
              >
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="card">{t("products.loading")}</div>
      ) : products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <article className="card overflow-hidden p-0" key={p.id}>
              <div className="flex h-48 items-center justify-center bg-stone-100 dark:bg-stone-800">
                {p.images?.[0]?.url && (
                  <img
                    src={p.images[0].url}
                    alt={p.translations?.ru?.title || p.slug}
                    className="h-full w-full object-cover"
                    onError={(ev) => {
                      ev.currentTarget.style.display = "none";
                    }}
                  />
                )}
                {!p.images?.[0]?.url && (
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <ImageOff size={24} />
                    <span className="text-xs">AVERON</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="font-bold">
                  {p.translations?.ru?.title || p.slug}
                </h2>
                <p className="mt-1 text-sm text-muted">{getCountryLabel(p.country)}</p>
                <div className="mt-3 flex justify-between">
                  <strong>
                    {Number(p.salePriceUzs).toLocaleString()} UZS
                  </strong>
                  <span className="badge-success">PUBLISHED</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(p);
                    setEditingCountry(p.country);
                  }}
                  className="btn-ghost mt-3 inline-flex items-center gap-2 text-sm"
                >
                  <Pencil size={14} />
                  {t("products.editCountry")}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card text-muted">{t("products.empty")}</div>
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
      <Modal
        isOpen={!!editingProduct}
        onClose={() => {
          setEditingProduct(null);
          setEditingCountry("");
        }}
        title={t("products.editCountry")}
        subtitle={editingProduct?.translations?.ru?.title || editingProduct?.slug}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setEditingProduct(null);
                setEditingCountry("");
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              loading={countryMutation.isPending}
              leftIcon={<Check size={15} />}
              disabled={!isProductCountry(editingCountry)}
              onClick={() => {
                if (editingProduct && isProductCountry(editingCountry)) {
                  countryMutation.mutate({ id: editingProduct.id, country: editingCountry });
                }
              }}
            >
              {t("products.saveCountry")}
            </Button>
          </div>
        }
      >
        <Select
          label={t("products.countryLabel")}
          placeholder={t("products.countryPlaceholder")}
          value={editingCountry}
          options={editableCountryOptions}
          onChange={(value) => setEditingCountry(isProductCountry(value) ? value : "")}
        />
      </Modal>
    </Layout>
  );
}
