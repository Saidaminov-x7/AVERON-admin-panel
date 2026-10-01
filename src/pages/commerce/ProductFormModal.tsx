import { useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { ImageOff, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Modal } from "../../components/ui";
import {
  getProductCountryDisplay,
  isProductCountry,
  PRODUCT_COUNTRIES,
  type ProductCategory,
  type ProductCountry,
  type ProductListItem,
  type ProductLocale,
  type ProductPayload,
} from "../../lib/commerceApi";

type LocalizedContent = {
  title: string;
  description: string;
};

type ProductFormValues = {
  translations: Record<ProductLocale, LocalizedContent>;
  country: string;
  categoryId: string;
  sourceUrl: string;
  imageUrl: string;
  salePriceUzs: string;
  color: string;
  size: string;
  publish: boolean;
};

export type ProductFormSubmission = Omit<ProductPayload, "country" | "imageUrl" | "categoryId"> & {
  country?: ProductCountry;
  categoryId?: string | null;
  imageUrlOrFile?: string | File;
};

type FormErrors = Partial<Record<"title" | "country" | "sourceUrl" | "salePriceUzs", string>>;

interface ProductFormModalProps {
  isOpen: boolean;
  product: ProductListItem | null;
  categories: ProductCategory[];
  categoriesError: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: ProductFormSubmission) => void;
}

const locales: ProductLocale[] = ["ru", "uz", "en"];
const localeLabels: Record<ProductLocale, string> = {
  ru: "RU",
  uz: "UZ",
  en: "EN",
};

const readTitle = (product: ProductListItem, locale: ProductLocale): string => {
  const value = product.translations?.[locale];
  if (typeof value === "string") return value;
  return value?.title ?? "";
};

const readDescription = (product: ProductListItem, locale: ProductLocale): string => {
  const value = product.description?.[locale];
  return typeof value === "string" ? value : "";
};

const getInitialValues = (product: ProductListItem | null): ProductFormValues => ({
  translations: {
    ru: { title: product ? readTitle(product, "ru") : "", description: product ? readDescription(product, "ru") : "" },
    uz: { title: product ? readTitle(product, "uz") : "", description: product ? readDescription(product, "uz") : "" },
    en: { title: product ? readTitle(product, "en") : "", description: product ? readDescription(product, "en") : "" },
  },
  country: product?.country ?? "CN",
  categoryId: product?.categoryId ?? "",
  sourceUrl: product?.sourceUrl ?? "",
  imageUrl: product?.images?.[0]?.url ?? "",
  salePriceUzs: product ? String(product.salePriceUzs) : "",
  color: product?.source === "MANUAL" ? product.variants?.[0]?.color ?? "" : "",
  size: product?.source === "MANUAL" ? product.variants?.[0]?.size ?? "" : "",
  publish: product ? product.status === "PUBLISHED" : true,
});

export function ProductFormModal({
  isOpen,
  product,
  categories,
  categoriesError,
  isSaving,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const { t, i18n } = useTranslation();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeLocale, setActiveLocale] = useState<ProductLocale>("ru");
  const [values, setValues] = useState<ProductFormValues>(() => getInitialValues(product));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const updateLocalizedValue = (field: keyof LocalizedContent, value: string) => {
    setValues((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [activeLocale]: { ...current.translations[activeLocale], [field]: value },
      },
    }));
    if (field === "title" && activeLocale === "ru") {
      setErrors((current) => ({ ...current, title: undefined }));
    }
  };

  const updateValue = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === "country" || key === "sourceUrl" || key === "salePriceUzs") {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = locales.indexOf(activeLocale);
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % locales.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex + locales.length - 1) % locales.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = locales.length - 1;
    else return;

    event.preventDefault();
    setActiveLocale(locales[nextIndex]);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  const handleFileSelect = (file: File) => {
    setImageFile(file);
    setLocalPreview(null);
    setImageError(false);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") setLocalPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = values.translations.ru.title.trim();
    const sourceUrl = values.sourceUrl.trim();
    const salePriceUzs = Number(values.salePriceUzs);
    const nextErrors: FormErrors = {};

    if (title.length < 2) nextErrors.title = t("products.validationTitle");
    const countryIsUnchangedUnknown = Boolean(product)
      && values.country === product?.country
      && !isProductCountry(values.country);
    if (!isProductCountry(values.country) && !countryIsUnchangedUnknown) {
      nextErrors.country = t("products.countryRequired");
    }
    try {
      const url = new URL(sourceUrl);
      if (!url.protocol || !url.host) nextErrors.sourceUrl = t("products.validationSourceUrl");
    } catch {
      nextErrors.sourceUrl = t("products.validationSourceUrl");
    }
    if (!Number.isFinite(salePriceUzs) || salePriceUzs <= 0) {
      nextErrors.salePriceUzs = t("products.validationSalePrice");
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.title) setActiveLocale("ru");
      return;
    }

    const imageUrl = values.imageUrl.trim();
    const originalImageUrl = product?.images?.[0]?.url ?? "";
    onSubmit({
      title,
      country: isProductCountry(values.country) ? values.country : undefined,
      titleUz: values.translations.uz.title.trim(),
      titleEn: values.translations.en.title.trim(),
      description: values.translations.ru.description.trim(),
      descriptionUz: values.translations.uz.description.trim(),
      descriptionEn: values.translations.en.description.trim(),
      sourceUrl,
      imageUrlOrFile: imageFile ?? (imageUrl && imageUrl !== originalImageUrl ? imageUrl : undefined),
      salePriceUzs,
      categoryId: values.categoryId || null,
      color: values.color.trim(),
      size: values.size.trim(),
      publish: values.publish,
    });
  };

  const localeName = (locale: ProductLocale) => t(`products.contentLocale.${locale}`);
  const headerContent = (
    <div
      role="tablist"
      aria-label={t("products.contentLanguage")}
      className="inline-flex w-full rounded-xl border border-app bg-gray-50 p-1 dark:bg-white/5 sm:w-auto"
    >
      {locales.map((locale) => {
        const complete = locale === "ru"
          ? values.translations[locale].title.trim().length >= 2
          : values.translations[locale].title.trim().length > 0;
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            id={`${formId}-tab-${locale}`}
            aria-controls={`${formId}-panel`}
            aria-selected={activeLocale === locale}
            aria-label={t("products.contentTabLabel", {
              language: localeName(locale),
              status: complete ? t("products.translationComplete") : t("products.translationIncomplete"),
            })}
            tabIndex={activeLocale === locale ? 0 : -1}
            onClick={() => setActiveLocale(locale)}
            onKeyDown={handleTabKeyDown}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:flex-none ${
              activeLocale === locale
                ? "bg-surface text-primary-600 shadow-sm dark:text-primary-400"
                : "text-muted hover:text-app"
            }`}
          >
            {localeLabels[locale]}
            {complete && <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400">✓</span>}
          </button>
        );
      })}
    </div>
  );

  const localizedCategoryName = (category: ProductCategory) => {
    if (typeof category.name === "string") return category.name;
    const uiLocale = i18n.language.slice(0, 2);
    return category.name[uiLocale] || category.name.ru || category.name.en || category.slug;
  };
  const countryDisplay = getProductCountryDisplay(values.country);
  const imagePreview = localPreview || values.imageUrl;
  const fieldClass = "input";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(product ? "products.editProduct" : "products.createProduct")}
      subtitle={product?.translations?.ru && typeof product.translations.ru !== "string"
        ? product.translations.ru.title || product.slug
        : product?.slug}
      size="2xl"
      fullscreenOnMobile
      closeLabel={t("common.close")}
      headerContent={headerContent}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={isSaving}
          >
            {isSaving
              ? t(product ? "products.saving" : "products.creating")
              : t(product ? "products.saveChanges" : "products.saveBtn")}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4">
          <h4 className="text-sm font-bold text-app">{t("products.mainInformation")}</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.sourceLabel")}</span>
              <input
                required
                type="url"
                value={values.sourceUrl}
                onChange={(event) => updateValue("sourceUrl", event.target.value)}
                className={fieldClass}
                placeholder="https://..."
                aria-invalid={Boolean(errors.sourceUrl)}
                aria-describedby={errors.sourceUrl ? `${formId}-source-error` : undefined}
              />
              {errors.sourceUrl && <span id={`${formId}-source-error`} className="mt-1 block text-xs text-red-500">{errors.sourceUrl}</span>}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.countryLabel")}</span>
              <select
                required={!product}
                value={values.country}
                onChange={(event) => updateValue("country", event.target.value)}
                className={fieldClass}
                aria-invalid={Boolean(errors.country)}
                aria-describedby={errors.country ? `${formId}-country-error` : undefined}
              >
                {!isProductCountry(values.country) && product && (
                  <option value={values.country}>
                    {countryDisplay.flag} {t(countryDisplay.translationKey, countryDisplay.code ? { code: countryDisplay.code } : undefined)}
                  </option>
                )}
                {PRODUCT_COUNTRIES.map(({ code, flag, translationKey }) => (
                  <option key={code} value={code}>{flag} {t(translationKey)}</option>
                ))}
              </select>
              {errors.country && <span id={`${formId}-country-error`} className="mt-1 block text-xs text-red-500">{errors.country}</span>}
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.categoryLabel")}</span>
              <select
                value={values.categoryId}
                onChange={(event) => updateValue("categoryId", event.target.value)}
                className={fieldClass}
              >
                <option value="">{t("products.noCategory")}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{localizedCategoryName(category)}</option>
                ))}
              </select>
              {categoriesError && <span className="mt-1 block text-xs text-red-500">{t("products.categoriesLoadError")}</span>}
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-app">{t("products.localizedContent")}</h4>
            <p className="mt-1 text-xs text-muted">{t("products.localizedContentHint")}</p>
          </div>
          <div
            id={`${formId}-panel`}
            role="tabpanel"
            aria-labelledby={`${formId}-tab-${activeLocale}`}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.titleLabel")}</span>
              <input
                required={activeLocale === "ru"}
                maxLength={500}
                value={values.translations[activeLocale].title}
                onChange={(event) => updateLocalizedValue("title", event.target.value)}
                className={fieldClass}
                aria-invalid={activeLocale === "ru" && Boolean(errors.title)}
                aria-describedby={activeLocale === "ru" && errors.title ? `${formId}-title-error` : undefined}
              />
              {activeLocale === "ru" && errors.title && <span id={`${formId}-title-error`} className="mt-1 block text-xs text-red-500">{errors.title}</span>}
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.descLabel")}</span>
              <textarea
                maxLength={5000}
                value={values.translations[activeLocale].description}
                onChange={(event) => updateLocalizedValue("description", event.target.value)}
                className={`${fieldClass} min-h-28`}
              />
            </label>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-app">{t("products.priceSection")}</h4>
            <p className="mt-1 text-xs text-muted">{t("products.priceSectionHint")}</p>
          </div>
          <label className="block max-w-md">
            <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.salePriceLabel")}</span>
            <div className="relative">
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={values.salePriceUzs}
                onChange={(event) => updateValue("salePriceUzs", event.target.value)}
                className={`${fieldClass} pr-16`}
                aria-invalid={Boolean(errors.salePriceUzs)}
                aria-describedby={errors.salePriceUzs ? `${formId}-price-error` : undefined}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted">UZS</span>
            </div>
            {errors.salePriceUzs && <span id={`${formId}-price-error`} className="mt-1 block text-xs text-red-500">{errors.salePriceUzs}</span>}
          </label>
        </section>

        <section className="space-y-4">
          <h4 className="text-sm font-bold text-app">{t("products.photoSection")}</h4>
          <div className="grid gap-4 rounded-xl border border-app p-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-4">
            <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
              {imagePreview && !imageError ? (
                <img
                  src={imagePreview}
                  alt={values.translations[activeLocale].title || t("products.page")}
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
            <div className="min-w-0 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.imageLabel")}</span>
                <input
                  type="url"
                  value={values.imageUrl}
                  onChange={(event) => {
                    updateValue("imageUrl", event.target.value);
                    setImageFile(null);
                    setLocalPreview(null);
                    setImageError(false);
                  }}
                  className={fieldClass}
                  placeholder="https://..."
                />
              </label>
              <Button type="button" variant="outline" leftIcon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()}>
                {t("products.uploadBtn")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFileSelect(file);
                  event.currentTarget.value = "";
                }}
              />
              {imageFile && <p className="break-all text-xs font-medium text-violet-500">{imageFile.name}</p>}
              <p className="text-xs text-muted">{t("products.uploadHint")}</p>
            </div>
          </div>
        </section>

        {(product?.source === "MANUAL" || !product) && (
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-app">{t("products.additionalInformation")}</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.colorLabel")}</span>
                <input maxLength={80} value={values.color} onChange={(event) => updateValue("color", event.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-app">{t("products.sizeLabel")}</span>
                <input maxLength={80} value={values.size} onChange={(event) => updateValue("size", event.target.value)} className={fieldClass} />
              </label>
              {!product && (
                <label className="flex items-center gap-2 md:col-span-2">
                  <input type="checkbox" checked={values.publish} onChange={(event) => updateValue("publish", event.target.checked)} />
                  <span className="text-sm text-app">{t("products.publishLabel")}</span>
                </label>
              )}
            </div>
          </section>
        )}
      </form>
    </Modal>
  );
}
