import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ImageOff, MoveDown, MoveUp, Sparkles, Star, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Modal, Select, Textarea } from "../../components/ui";
import { CountryFlag } from "../../components/commerce/CountryFlag";
import { LanguageFlag } from "../../components/ui/LanguageFlag";
import { useAdminCapabilities } from "../../hooks/useAdminCapabilities";
import {
  applyProductAiSuggestions,
  getProductAiSuggestionsApi,
  hasAiProductFillCapability,
  toProductAiCountry,
  type ProductAiSuggestionsResponse,
} from "../../lib/productAiApi";
import {
  getProductCountryDisplay,
  isProductCountry,
  PRODUCT_COUNTRIES,
  type ProductCategory,
  type ProductCountry,
  type ProductListItem,
  type ProductLocale,
} from "../../lib/commerceApi";
import {
  fileIdentity,
  formatPhotoSize,
  PRODUCT_VALIDATION_FIELDS,
  reorderItem,
  validateProductDraft,
  type ProductValidationField,
} from "./productFormValidation";

type LocalizedContent = { title: string; description: string };
type PhotoDraft = {
  key: string;
  id?: string;
  mediaId?: string | null;
  url: string;
  file?: File;
};
type ProductFormValues = {
  translations: Record<ProductLocale, LocalizedContent>;
  country: string;
  categoryId: string;
  salePriceUzs: string;
  color: string;
  size: string;
  publish: boolean;
};
type FormErrors = Partial<Record<ProductValidationField, string>>;

export type ProductFormSubmission = {
  title: string;
  titleUz: string;
  titleEn: string;
  description: string;
  descriptionUz: string;
  descriptionEn: string;
  sourceUrl?: string;
  salePriceUzs: number;
  country?: ProductCountry;
  categoryId?: string | null;
  color: string;
  size: string;
  publish: boolean;
  images: Array<{ id: string } | { file: File }>;
};

interface ProductFormModalProps {
  isOpen: boolean;
  product: ProductListItem | null;
  categories: ProductCategory[];
  categoriesError: boolean;
  isSaving: boolean;
  submissionError: string | null;
  settingsLoading: boolean;
  maxProductPhotos: number;
  maxProductPhotoSizeMb: number;
  onClose: () => void;
  onSubmit: (values: ProductFormSubmission) => void;
}

const locales: ProductLocale[] = ["ru", "uz", "en"];
const localeErrorKeys: Record<ProductLocale, "titleRu" | "titleUz" | "titleEn"> = {
  ru: "titleRu",
  uz: "titleUz",
  en: "titleEn",
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
  country: product?.country ?? "",
  categoryId: product?.categoryId ?? "",
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
  submissionError,
  settingsLoading,
  maxProductPhotos,
  maxProductPhotoSizeMb,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const [activeLocale, setActiveLocale] = useState<ProductLocale>("ru");
  const [values, setValues] = useState<ProductFormValues>(() => getInitialValues(product));
  const [photos, setPhotos] = useState<PhotoDraft[]>(() => (product?.images ?? []).map((image) => ({
    key: `existing-${image.id}`,
    id: image.id,
    mediaId: image.mediaId,
    url: image.url,
  })));
  const [errors, setErrors] = useState<FormErrors>({});
  const [photoInputErrors, setPhotoInputErrors] = useState<string[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<ProductAiSuggestionsResponse | null>(null);
  const [aiError, setAiError] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const aiRequestRef = useRef<AbortController | null>(null);

  const capabilitiesQuery = useAdminCapabilities(isOpen);

  const releaseObjectUrls = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    aiRequestRef.current?.abort();
    aiRequestRef.current = null;
    setIsGeneratingAi(false);
    setAiSuggestions(null);
    setAiError("");
    if (!isOpen) {
      releaseObjectUrls();
      setValues(getInitialValues(null));
      setPhotos([]);
      setErrors({});
      setPhotoInputErrors([]);
      setSubmitAttempted(false);
      setActiveLocale("ru");
      return;
    }
    releaseObjectUrls();
    setActiveLocale("ru");
    setValues(getInitialValues(product));
    setPhotos((product?.images ?? []).map((image) => ({
      key: `existing-${image.id}`,
      id: image.id,
      mediaId: image.mediaId,
      url: image.url,
    })));
    setErrors({});
    setPhotoInputErrors([]);
    setSubmitAttempted(false);
  }, [isOpen, product, releaseObjectUrls]);

  useEffect(() => () => releaseObjectUrls(), [releaseObjectUrls]);

  const updateLocalizedValue = (field: keyof LocalizedContent, value: string) => {
    setValues((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [activeLocale]: { ...current.translations[activeLocale], [field]: value },
      },
    }));
    if (field === "title") {
      const errorKey = localeErrorKeys[activeLocale];
      setErrors((current) => value.trim().length >= 2
        ? { ...current, [errorKey]: undefined }
        : current);
    }
  };

  const updateValue = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
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

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const issues: string[] = [];
    const maxSize = Math.min(25, Math.max(1, maxProductPhotoSizeMb)) * 1024 * 1024;
    const maxCount = Math.min(15, Math.max(1, maxProductPhotos));
    const knownFiles = new Set(photos.flatMap((photo) => photo.file ? [fileIdentity(photo.file)] : []));
    const additions: PhotoDraft[] = [];

    for (const file of selectedFiles) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        issues.push(t("products.photoInvalidType", { name: file.name }));
        continue;
      }
      if (file.size > maxSize) {
        issues.push(t("products.photoTooLarge", { name: file.name, size: maxProductPhotoSizeMb }));
        continue;
      }
      const identity = fileIdentity(file);
      if (knownFiles.has(identity)) {
        issues.push(t("products.duplicatePhoto"));
        continue;
      }
      if (photos.length + additions.length >= maxCount) {
        issues.push(t("products.photoLimitReached", { max: maxCount }));
        break;
      }
      knownFiles.add(identity);
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      additions.push({ key: `local-${identity}-${crypto.randomUUID()}`, file, url });
    }

    if (additions.length) {
      setPhotos((current) => [...current, ...additions]);
      setErrors((current) => ({ ...current, photos: undefined }));
    }
    setPhotoInputErrors(issues);
    event.currentTarget.value = "";
  };

  const removePhoto = (photo: PhotoDraft) => {
    if (photo.file) {
      URL.revokeObjectURL(photo.url);
      objectUrlsRef.current.delete(photo.url);
    }
    setPhotos((current) => current.filter((item) => item.key !== photo.key));
    setErrors((current) => ({ ...current, photos: undefined }));
  };

  const movePhoto = (index: number, offset: -1 | 1) => {
    setPhotos((current) => reorderItem(current, index, offset));
  };

  const generateAiSuggestions = async () => {
    if (
      !isOpen ||
      capabilitiesQuery.isError ||
      !hasAiProductFillCapability(capabilitiesQuery.data) ||
      isGeneratingAi
    ) return;

    aiRequestRef.current?.abort();
    const controller = new AbortController();
    aiRequestRef.current = controller;
    setIsGeneratingAi(true);
    setAiSuggestions(null);
    setAiError("");
    try {
      const selectedCategory = categories.find((category) => category.id === values.categoryId);
      const categoryName = selectedCategory ? localizedCategoryName(selectedCategory).trim() : "";
      const sourceTitle = values.translations[activeLocale].title.trim();
      const sourceDescription = values.translations[activeLocale].description.trim();
      if (!sourceTitle) {
        setAiError(t("products.aiFill.sourceTitleRequired"));
        return;
      }
      const variant = {
        ...(values.size.trim() ? { size: values.size.trim() } : {}),
        ...(values.color.trim() ? { color: values.color.trim() } : {}),
      };
      const result = await getProductAiSuggestionsApi(capabilitiesQuery.data, {
        sourceTitle,
        ...(sourceDescription ? { sourceDescription } : {}),
        country: toProductAiCountry(values.country),
        ...(categoryName ? { categoryName } : {}),
        ...(Object.keys(variant).length ? { variants: [variant] } : {}),
      }, controller.signal);
      if (!controller.signal.aborted) setAiSuggestions(result);
    } catch (error) {
      if (!controller.signal.aborted) {
        const responseData = isAxiosError(error)
          ? error.response?.data as { code?: unknown } | undefined
          : undefined;
        if (isAxiosError(error) && error.response?.status === 403 && responseData?.code === "FEATURE_DISABLED") {
          void queryClient.invalidateQueries({ queryKey: ["admin", "capabilities"] });
          setAiError(t("products.aiFill.disabled"));
        } else {
          setAiError(t("products.aiFill.error"));
        }
      }
    } finally {
      if (aiRequestRef.current === controller) {
        aiRequestRef.current = null;
        setIsGeneratingAi(false);
      }
    }
  };

  const cancelAiSuggestions = () => {
    aiRequestRef.current?.abort();
    aiRequestRef.current = null;
    setIsGeneratingAi(false);
    setAiSuggestions(null);
    setAiError("");
  };

  const applyAiSuggestions = () => {
    if (!aiSuggestions) return;
    const result = applyProductAiSuggestions(
      values.translations,
      { color: values.color, size: values.size },
      aiSuggestions.suggestions,
    );
    if (!result.appliedCount) return;
    setValues((current) => ({
      ...current,
      translations: result.translations,
      color: result.variant.color ?? current.color,
      size: result.variant.size ?? current.size,
    }));
    setErrors((current) => {
      const next = { ...current };
      for (const locale of locales) {
        if (result.translations[locale].title.trim().length >= 2) {
          next[localeErrorKeys[locale]] = undefined;
        }
      }
      return next;
    });
    if (result.firstAppliedLocale) setActiveLocale(result.firstAppliedLocale);
    setAiSuggestions(null);
    setAiError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    const nextErrors: FormErrors = {};
    const validationCodes = validateProductDraft({
      titles: {
        ru: values.translations.ru.title,
        uz: values.translations.uz.title,
        en: values.translations.en.title,
      },
      country: values.country,
      existingCountry: product?.country,
      salePriceUzs: values.salePriceUzs,
      photoCount: photos.length,
      photoSizes: photos.flatMap((photo) => photo.file ? [photo.file.size] : []),
      maxPhotos: maxProductPhotos,
      maxPhotoSizeMb: maxProductPhotoSizeMb,
    }, isProductCountry);
    const validationMessages = {
      title: t("products.validationTitleLocale"),
      country: t("products.countryRequired"),
      salePriceUzs: t("products.validationSalePrice"),
      photos: t("products.validationPhotos"),
      photoCount: t("products.photoLimitReached", { max: Math.min(15, maxProductPhotos) }),
      photoSize: t("products.photoSizeLimit", { size: maxProductPhotoSizeMb }),
    };
    for (const field of PRODUCT_VALIDATION_FIELDS) {
      const code = validationCodes[field];
      if (code) nextErrors[field] = validationMessages[code];
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstMissingLocale = locales.find((locale) => nextErrors[localeErrorKeys[locale]]);
      if (firstMissingLocale) setActiveLocale(firstMissingLocale);
      return;
    }

    onSubmit({
      title: values.translations.ru.title.trim(),
      titleUz: values.translations.uz.title.trim(),
      titleEn: values.translations.en.title.trim(),
      description: values.translations.ru.description.trim(),
      descriptionUz: values.translations.uz.description.trim(),
      descriptionEn: values.translations.en.description.trim(),
      salePriceUzs: Number(values.salePriceUzs),
      country: isProductCountry(values.country) ? values.country : undefined,
      categoryId: values.categoryId || null,
      color: values.color.trim(),
      size: values.size.trim(),
      publish: values.publish,
      images: photos.map((photo) => photo.file ? { file: photo.file } : { id: photo.id! }),
    });
  };

  const localeName = (locale: ProductLocale) => t(`products.contentLocale.${locale}`);
  const localizedCategoryName = (category: ProductCategory) => {
    if (typeof category.name === "string") return category.name;
    const uiLocale = i18n.language.slice(0, 2);
    return category.name[uiLocale] || category.name.ru || category.name.en || category.slug;
  };
  const countryDisplay = getProductCountryDisplay(values.country);
  const canApplyAiSuggestions = Boolean(aiSuggestions && applyProductAiSuggestions(
    values.translations,
    { color: values.color, size: values.size },
    aiSuggestions.suggestions,
  ).appliedCount);
  const countryOptions = [
    ...(!isProductCountry(values.country) && product
      ? [{ value: values.country, label: `${countryDisplay.flag} ${t("products.unknownCountry")}` }]
      : []),
    ...PRODUCT_COUNTRIES.map(({ code, translationKey }) => ({
      value: code,
      label: t(translationKey),
      icon: <CountryFlag country={code} />,
    })),
  ];
  const categoryOptions = [
    { value: "", label: t("products.noCategory") },
    ...categories.filter((category) => category.active !== false || category.id === values.categoryId).map((category) => ({
      value: category.id,
      label: `${localizedCategoryName(category)}${category.active === false ? ` (${t("categories.inactive")})` : ""}`,
    })),
  ];
  const errorLabels: Record<keyof FormErrors, string> = {
    titleRu: `${t("products.titleLabel")} (RU)`,
    titleUz: `${t("products.titleLabel")} (UZ)`,
    titleEn: `${t("products.titleLabel")} (EN)`,
    country: t("products.countryLabel"),
    salePriceUzs: t("products.salePriceLabel"),
    photos: t("products.photoSection"),
  };
  const headerContent = (
    <div role="tablist" aria-label={t("products.contentLanguage")} className="inline-flex w-full rounded-xl border border-app bg-gray-50 p-1 dark:bg-white/5 sm:w-auto">
      {locales.map((locale) => {
        const error = errors[localeErrorKeys[locale]];
        const complete = values.translations[locale].title.trim().length >= 2;
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
              status: error ? t("products.translationError") : complete ? t("products.translationComplete") : t("products.translationIncomplete"),
            })}
            tabIndex={activeLocale === locale ? 0 : -1}
            onClick={() => setActiveLocale(locale)}
            onKeyDown={handleTabKeyDown}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 sm:flex-none ${
              activeLocale === locale ? "bg-surface text-primary-600 shadow-sm dark:text-primary-400" : "text-muted hover:text-app"
            }`}
          >
            <LanguageFlag locale={locale} className="h-4 w-6" />
            {error ? <span aria-hidden="true" className="text-red-500">!</span> : complete ? <span aria-hidden="true" className="text-emerald-600">✓</span> : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(product ? "products.editProduct" : "products.createProduct")}
      subtitle={product?.slug}
      size="2xl"
      fullscreenOnMobile
      closeLabel={t("common.close")}
      headerContent={headerContent}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>{t("common.cancel")}</Button>
          <Button type="submit" form={formId} loading={isSaving} disabled={settingsLoading}>
            {isSaving ? t(product ? "products.saving" : "products.creating") : t(product ? "products.saveChanges" : "products.saveBtn")}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-6">
        {submissionError && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {submissionError}
          </div>
        )}
        {submitAttempted && Object.keys(errors).length > 0 && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            <p className="font-semibold">{t("products.formHasErrors")}</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {Object.entries(errors).map(([field, message]) => message && (
                <li key={field}><strong>{errorLabels[field as keyof FormErrors]}:</strong> {message}</li>
              ))}
            </ul>
          </div>
        )}
        <section className="space-y-4">
          <h4 className="text-sm font-bold text-app">{t("products.mainInformation")}</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label={t("products.countryLabel")}
              placeholder={t("products.countryPlaceholder")}
              value={values.country}
              options={countryOptions}
              onChange={(value) => updateValue("country", value)}
              error={errors.country}
            />
            <div className="md:col-span-2">
              <Select
                label={t("products.categoryLabel")}
                value={values.categoryId}
                options={categoryOptions}
                onChange={(value) => updateValue("categoryId", value)}
                error={categoriesError ? t("products.categoriesLoadError") : undefined}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-app">{t("products.localizedContent")}</h4>
              <p className="mt-1 text-xs text-muted">{t("products.localizedContentHint")}</p>
            </div>
            {hasAiProductFillCapability(capabilitiesQuery.data) && !capabilitiesQuery.isError && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<Sparkles size={16} />}
                  onClick={() => void generateAiSuggestions()}
                  disabled={isGeneratingAi}
                >
                  {isGeneratingAi ? t("products.aiFill.generating") : t("products.aiFill.action")}
                </Button>
                {isGeneratingAi && (
                  <Button type="button" variant="ghost" onClick={cancelAiSuggestions}>
                    {t("products.aiFill.cancel")}
                  </Button>
                )}
              </div>
            )}
          </div>
          {aiError && <p role="alert" className="text-sm text-red-500">{aiError}</p>}
          {aiSuggestions && (
            <div role="region" aria-label={t("products.aiFill.preview")} className="space-y-3 rounded-xl border border-primary-500/30 bg-primary-500/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h5 className="text-sm font-semibold text-app">{t("products.aiFill.preview")}</h5>
                  <p className="mt-1 text-xs text-muted">{t("products.aiFill.previewHint")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" onClick={() => setAiSuggestions(null)}>
                    {t("products.aiFill.ignore")}
                  </Button>
                  <Button type="button" onClick={applyAiSuggestions} disabled={!canApplyAiSuggestions}>
                    {t("products.aiFill.apply")}
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {locales.map((locale) => {
                  const suggestion = aiSuggestions.suggestions[locale];
                  const title = suggestion.title.trim();
                  const description = suggestion.description.trim();
                  const characteristics = Object.entries(suggestion.characteristics)
                    .filter(([, value]) => value.trim());
                  if (!title && !description && !characteristics.length) return null;
                  return (
                    <div key={locale} className="min-w-0 space-y-2 rounded-lg border border-app bg-surface p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-app">
                        <LanguageFlag locale={locale} className="h-4 w-6" />
                        {localeName(locale)}
                      </div>
                      {title && <p className="break-words text-sm font-medium text-app">{title}</p>}
                      {description && <p className="whitespace-pre-wrap break-words text-xs text-muted">{description}</p>}
                      {characteristics.length > 0 && (
                        <dl className="space-y-1 border-t border-app pt-2">
                          {characteristics.map(([name, value]) => (
                            <div key={name} className="flex flex-wrap justify-between gap-x-2 text-xs">
                              <dt className="text-muted">{name}</dt>
                              <dd className="break-words text-right text-app">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div id={`${formId}-panel`} role="tabpanel" aria-labelledby={`${formId}-tab-${activeLocale}`} className="grid gap-4 md:grid-cols-2">
            <Input
              label={t("products.titleLabel")}
              maxLength={500}
              value={values.translations[activeLocale].title}
              onChange={(event) => updateLocalizedValue("title", event.target.value)}
              error={errors[localeErrorKeys[activeLocale]]}
              containerClassName="md:col-span-2"
            />
            <Textarea
              label={t("products.descLabel")}
              maxLength={5000}
              value={values.translations[activeLocale].description}
              onChange={(event) => updateLocalizedValue("description", event.target.value)}
              className="min-h-32 resize-y"
              containerClassName="md:col-span-2"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-app">{t("products.priceSection")}</h4>
            <p className="mt-1 text-xs text-muted">{t("products.priceSectionHint")}</p>
          </div>
          <Input
            label={t("products.salePriceLabel")}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={values.salePriceUzs}
            onChange={(event) => updateValue("salePriceUzs", event.target.value)}
            error={errors.salePriceUzs}
            className="max-w-md"
          />
        </section>

        <section className="space-y-4">
          <div>
            <h4 className="text-sm font-bold text-app">{t("products.photoSection")}</h4>
            <p className="mt-1 text-xs text-muted">
              {t("products.photoCount", { count: photos.length, max: Math.min(15, maxProductPhotos) })} · {t("products.photoSizeLimit", { size: maxProductPhotoSizeMb })}
            </p>
          </div>
          {errors.photos && <p role="alert" className="text-sm text-red-500">{errors.photos}</p>}
          {photoInputErrors.map((issue, index) => <p key={`${issue}-${index}`} role="alert" className="text-sm text-red-500">{issue}</p>)}
          {photos.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <li key={photo.key} className={`relative min-w-0 overflow-hidden rounded-xl border ${index === 0 ? "border-primary-500 ring-1 ring-primary-500/30" : "border-app"}`}>
                  <div className="relative flex h-36 items-center justify-center bg-stone-100 dark:bg-stone-800">
                    {photo.url ? <img src={photo.url} alt="" className="h-full w-full object-cover" /> : <ImageOff size={24} className="text-muted" />}
                    {index === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-bold text-white"><Star size={12} fill="currentColor" />{t("products.mainPhoto")}</span>}
                    <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white">{index + 1}</span>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-xs text-app">{photo.file?.name ?? t("products.existingPhoto")}</p>
                    <p className="text-xs text-muted">{photo.file ? formatPhotoSize(photo.file.size) : t("products.alreadyUploaded")}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        <button type="button" disabled={index === 0} onClick={() => movePhoto(index, -1)} aria-label={t("products.movePhotoUp")} className="rounded-lg p-2 text-muted hover:bg-app disabled:opacity-40"><MoveUp size={16} /></button>
                        <button type="button" disabled={index === photos.length - 1} onClick={() => movePhoto(index, 1)} aria-label={t("products.movePhotoDown")} className="rounded-lg p-2 text-muted hover:bg-app disabled:opacity-40"><MoveDown size={16} /></button>
                      </div>
                      <button type="button" onClick={() => removePhoto(photo)} aria-label={t("products.removePhoto")} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <Button type="button" variant="outline" leftIcon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()} disabled={settingsLoading || photos.length >= Math.min(15, maxProductPhotos)}>
            {t("products.addPhotos")}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={handleFileSelect}
          />
        </section>

        {(product?.source === "MANUAL" || !product) && (
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-app">{t("products.additionalInformation")}</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label={t("products.colorLabel")} maxLength={80} value={values.color} onChange={(event) => updateValue("color", event.target.value)} />
              <Input label={t("products.sizeLabel")} maxLength={80} value={values.size} onChange={(event) => updateValue("size", event.target.value)} />
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
