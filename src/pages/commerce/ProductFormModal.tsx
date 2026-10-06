import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ImageOff, MoveDown, MoveUp, RefreshCw, Sparkles, Star, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Modal, Select } from "../../components/ui";
import { CountryFlag } from "../../components/commerce/CountryFlag";
import { LanguageFlag } from "../../components/ui/LanguageFlag";
import { useAdminCapabilities } from "../../hooks/useAdminCapabilities";
import {
  applyProductAiSuggestions,
  getProductAiSuggestionsApi,
  hasAiProductFillCapability,
  hasImageEmbeddingsCapability,
  toProductAiCountry,
  type ProductAiSuggestionsResponse,
} from "../../lib/productAiApi";
import { uploadProductPhotoApi } from "../../lib/mediaApi";
import {
  getProductImageEmbeddingApi,
  reindexProductImageEmbeddingApi,
} from "../../lib/productImageEmbeddingApi";
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
import {
  calculateProductPhotoCropRect,
  cropProductPhoto,
  DEFAULT_PRODUCT_PHOTO_CROP,
  productPhotoCropSignature,
  type ProductPhotoCrop,
  type ProductPhotoOrientation,
} from "./productImageCrop";
import { ProductRichTextField } from "./ProductRichTextField";

type LocalizedContent = { title: string; description: string };
type PhotoDraft = {
  key: string;
  id?: string;
  mediaId?: string | null;
  mediaCropSignature?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  url: string;
  file?: File;
  crop: ProductPhotoCrop;
};

function getPhotoPreviewStyle(photo: PhotoDraft) {
  if (productPhotoCropSignature(photo.crop) === productPhotoCropSignature(DEFAULT_PRODUCT_PHOTO_CROP)) {
    return undefined;
  }
  if (!photo.file || !photo.naturalWidth || !photo.naturalHeight) {
    return photo.file
      ? { objectPosition: `${photo.crop.x}% ${photo.crop.y}%`, transform: `scale(${photo.crop.zoom})` }
      : undefined;
  }

  const rect = calculateProductPhotoCropRect(photo.naturalWidth, photo.naturalHeight, photo.crop);
  return {
    width: `${photo.naturalWidth / rect.width * 100}%`,
    height: `${photo.naturalHeight / rect.height * 100}%`,
    left: `${-rect.x / rect.width * 100}%`,
    top: `${-rect.y / rect.height * 100}%`,
    objectFit: "fill" as const,
  };
}
type ProductFormValues = {
  translations: Record<ProductLocale, LocalizedContent>;
  country: string;
  categoryId: string;
  salePriceUzs: string;
  compareAtPriceUzs: string;
  stock: string;
  colorsText: string;
  color: string;
  size: string;
  sizesText: string;
  sizeChartType: "" | "CLOTHING" | "SHOES" | "KIDS_CLOTHING";
  publish: boolean;
  publishTelegram: boolean;
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
  stock: number;
  compareAtPriceUzs: number | null;
  colors: Array<{ name: string; hex: string }>;
  country?: ProductCountry;
  categoryId?: string | null;
  color: string;
  size: string;
  sizeChartType: ProductFormValues["sizeChartType"];
  publish: boolean;
  publishTelegram: boolean;
  images: Array<{ id: string } | { mediaId: string } | { file: File }>;
};

interface ProductFormModalProps {
  isOpen: boolean;
  presentation?: "dialog" | "page";
  product: ProductListItem | null;
  categories: ProductCategory[];
  categoriesError: boolean;
  isSaving: boolean;
  submissionError: string | null;
  telegramPublishError: string | null;
  isRetryingTelegram: boolean;
  onRetryTelegram: () => void;
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
  compareAtPriceUzs: product?.compareAtPriceUzs ? String(product.compareAtPriceUzs) : "",
  stock: product?.variants?.[0]?.stock !== undefined ? String(product.variants[0].stock) : "0",
  colorsText: product?.variants?.map((variant) => {
    const [name, hex] = (variant.color ?? "").split("::");
    return hex ? `${name} | ${hex}` : "";
  }).filter(Boolean).join("\n") ?? "",
  color: product?.source === "MANUAL" ? product.variants?.[0]?.color ?? "" : "",
  size: product?.source === "MANUAL" ? product.variants?.[0]?.size ?? "" : "",
  sizesText: product?.variants?.map((variant) => variant.size).filter(Boolean).join(", ") ?? "",
  sizeChartType: product?.sizeChartType ?? "",
  publish: product ? product.status === "PUBLISHED" : true,
  publishTelegram: false,
});

export function ProductFormModal({
  isOpen,
  presentation = "dialog",
  product,
  categories,
  categoriesError,
  isSaving,
  submissionError,
  telegramPublishError,
  isRetryingTelegram,
  onRetryTelegram,
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
  const cropDragRef = useRef<{
    key: string;
    pointerId: number;
    clientX: number;
    clientY: number;
    focusX: number;
    focusY: number;
  } | null>(null);
  const [activeLocale, setActiveLocale] = useState<ProductLocale>("ru");
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ["Основная информация", "Цены", "Варианты", "Фотографии", "Публикация"];
  const parseSizes = (text: string) => text.split(/[\n,]+/).map((size) => size.trim()).filter(Boolean);
  const [values, setValues] = useState<ProductFormValues>(() => getInitialValues(product));
  const [photos, setPhotos] = useState<PhotoDraft[]>(() => (product?.images ?? []).map((image) => ({
    key: `existing-${image.id}`,
    id: image.id,
    mediaId: image.mediaId,
    url: image.url,
    crop: { ...DEFAULT_PRODUCT_PHOTO_CROP },
  })));
  const [errors, setErrors] = useState<FormErrors>({});
  const [photoInputErrors, setPhotoInputErrors] = useState<string[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<ProductAiSuggestionsResponse | null>(null);
  const [aiError, setAiError] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isReindexingImage, setIsReindexingImage] = useState(false);
  const [imageEmbeddingError, setImageEmbeddingError] = useState("");
  const [imageEmbeddingSuccess, setImageEmbeddingSuccess] = useState("");
  const aiRequestRef = useRef<AbortController | null>(null);

  const capabilitiesQuery = useAdminCapabilities(isOpen);
  const imageEmbeddingQuery = useQuery({
    queryKey: ["admin", "products", product?.id, "image-embedding"],
    queryFn: ({ signal }) => getProductImageEmbeddingApi(product!.id, signal),
    enabled: isOpen && Boolean(product?.id) &&
      !capabilitiesQuery.isError &&
      hasImageEmbeddingsCapability(capabilitiesQuery.data),
    retry: false,
  });

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
      setIsPreparingImages(false);
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
      crop: { ...DEFAULT_PRODUCT_PHOTO_CROP },
    })));
    setErrors({});
    setPhotoInputErrors([]);
    setSubmitAttempted(false);
    setIsPreparingImages(false);
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
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "publish" && value === false ? { publishTelegram: false } : {}),
    }));
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
      additions.push({
        key: `local-${identity}-${crypto.randomUUID()}`,
        file,
        url,
        crop: { ...DEFAULT_PRODUCT_PHOTO_CROP },
      });
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

  const updatePhotoCrop = (key: string, patch: Partial<ProductPhotoCrop>) => {
    setPhotos((current) => current.map((photo) => photo.key === key
      ? { ...photo, crop: { ...photo.crop, ...patch } }
      : photo));
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
      if (!photos.length) {
        setAiError(t("products.aiFill.imageRequired"));
        return;
      }
      if (photos.length > 5) {
        setAiError(t("products.aiFill.imageLimit"));
        return;
      }
      const mediaIds: string[] = [];
      for (const photo of photos) {
        if (photo.mediaId && (
          !photo.file || photo.mediaCropSignature === productPhotoCropSignature(photo.crop)
        )) {
          mediaIds.push(photo.mediaId);
          continue;
        }
        if (!photo.file) throw new Error("PRODUCT_IMAGE_NOT_AVAILABLE");
        const croppedFile = await cropProductPhoto(photo.file, photo.crop);
        const uploaded = await uploadProductPhotoApi(croppedFile);
        mediaIds.push(uploaded.id);
        setPhotos((current) => current.map((item) =>
          item.key === photo.key
            ? { ...item, mediaId: uploaded.id, mediaCropSignature: productPhotoCropSignature(photo.crop) }
            : item,
        ));
      }
      const selectedCategory = categories.find((category) => category.id === values.categoryId);
      const categoryName = selectedCategory ? localizedCategoryName(selectedCategory).trim() : "";
      const sourceTitle = values.translations[activeLocale].title.trim();
      const sourceDescription = values.translations[activeLocale].description.trim();
      const variant = {
        ...(values.size.trim() ? { size: values.size.trim() } : {}),
        ...(values.color.trim() ? { color: values.color.trim() } : {}),
      };
      const result = await getProductAiSuggestionsApi(capabilitiesQuery.data, {
        mediaIds,
        ...(sourceTitle ? { sourceTitle } : {}),
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

  const reindexImageEmbedding = async () => {
    if (
      !product?.id ||
      capabilitiesQuery.isError ||
      !hasImageEmbeddingsCapability(capabilitiesQuery.data) ||
      isReindexingImage
    ) return;

    setIsReindexingImage(true);
    setImageEmbeddingError("");
    setImageEmbeddingSuccess("");
    try {
      const result = await reindexProductImageEmbeddingApi(product.id);
      if ("code" in result) {
        setImageEmbeddingError(t(
          result.code === "FEATURE_DISABLED"
            ? "products.imageEmbeddings.featureDisabled"
            : "products.imageEmbeddings.providerNotConfigured",
        ));
        if (result.code === "FEATURE_DISABLED") {
          void queryClient.invalidateQueries({ queryKey: ["admin", "capabilities"] });
        }
        return;
      }
      setImageEmbeddingSuccess(t("products.imageEmbeddings.reindexSuccess"));
      await queryClient.invalidateQueries({
        queryKey: ["admin", "products", product.id, "image-embedding"],
      });
    } catch {
      setImageEmbeddingError(t("products.imageEmbeddings.reindexError"));
    } finally {
      setIsReindexingImage(false);
    }
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPreparingImages || isSaving) return;
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

    setIsPreparingImages(true);
    setPhotoInputErrors([]);
    try {
      const images: ProductFormSubmission["images"] = [];
      for (const photo of photos) {
        const signature = productPhotoCropSignature(photo.crop);
        if (photo.mediaId && (!photo.file || photo.mediaCropSignature === signature)) {
          images.push({ mediaId: photo.mediaId });
        } else if (photo.file) {
          images.push({ file: await cropProductPhoto(photo.file, photo.crop) });
        } else if (photo.id) {
          images.push({ id: photo.id });
        }
      }

      onSubmit({
        title: values.translations.ru.title.trim(),
        titleUz: values.translations.uz.title.trim(),
        titleEn: values.translations.en.title.trim(),
        description: values.translations.ru.description.trim(),
        descriptionUz: values.translations.uz.description.trim(),
        descriptionEn: values.translations.en.description.trim(),
        salePriceUzs: Number(values.salePriceUzs),
        stock: Math.max(0, Math.floor(Number(values.stock || 0))),
        compareAtPriceUzs: values.compareAtPriceUzs ? Number(values.compareAtPriceUzs) : null,
        colors: values.colorsText.split("\n").map((row) => {
          const [name, hex] = row.split("|").map((part) => part.trim());
          return { name, hex };
        }).filter((item) => item.name && /^#[0-9a-fA-F]{6}$/.test(item.hex)),
        country: isProductCountry(values.country) ? values.country : undefined,
        categoryId: values.categoryId || null,
        color: values.color.trim(),
        size: parseSizes(values.sizesText).join(", ") || values.size.trim(),
        sizeChartType: values.sizeChartType,
        publish: values.publish,
        publishTelegram: values.publishTelegram,
        images,
      });
    } catch {
      setPhotoInputErrors([t("products.photoCropError")]);
    } finally {
      setIsPreparingImages(false);
    }
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
  const photoOrientations: Array<{
    value: ProductPhotoOrientation;
    label: string;
    aspectClass: string;
  }> = [
    { value: "portrait", label: t("products.photoPortrait"), aspectClass: "aspect-[4/5]" },
    { value: "landscape", label: t("products.photoLandscape"), aspectClass: "aspect-[4/3]" },
    { value: "square", label: t("products.photoSquare"), aspectClass: "aspect-square" },
  ];
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
      presentation={presentation}
      onClose={onClose}
      title={t(product ? "products.editProduct" : "products.createProduct")}
      subtitle={product?.slug}
      size="2xl"
      fullscreenOnMobile
      closeLabel={t("common.close")}
      headerContent={headerContent}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving || isPreparingImages}>{t("common.cancel")}</Button>
          {currentStep > 0 && <Button type="button" variant="outline" onClick={() => setCurrentStep((step) => step - 1)} disabled={isSaving || isPreparingImages}>Назад</Button>}
          {currentStep < steps.length - 1 ? <Button type="button" onClick={() => setCurrentStep((step) => step + 1)}>Далее</Button> : <Button type="submit" form={formId} loading={isSaving || isPreparingImages} disabled={settingsLoading || isPreparingImages}>
            {isPreparingImages
              ? t("products.preparingPhotos")
              : isSaving
                ? t(product ? "products.saving" : "products.creating")
                : t(product ? "products.saveChanges" : "products.saveBtn")}
          </Button>}
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <div className="flex gap-1">{steps.map((step, index) => <button key={step} type="button" onClick={() => setCurrentStep(index)} aria-label={step} className={`h-1 flex-1 rounded-full transition-colors ${index <= currentStep ? "bg-primary-600" : "bg-neutral-200 dark:bg-neutral-700"}`} />)}</div>
          <div className="flex items-center justify-between text-xs text-muted"><span>Шаг {currentStep + 1} из {steps.length}</span><span className="font-medium text-app">{steps[currentStep]}</span></div>
        </div>
        <div className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4">
          <p className="text-sm font-bold text-app">{product ? "Редактирование карточки товара" : "Новый товар — заполните по шагам"}</p>
          <p className="mt-1 text-xs leading-5 text-muted">1. Страна и категория · 2. Название и описание · 3. Цена, скидка и цвета · 4. Фотографии · 5. Публикация</p>
        </div>
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
        <section className={`${currentStep === 0 ? "" : "hidden "}space-y-4 rounded-xl border border-app bg-surface p-5`}>
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

        <section className={`${currentStep === 0 ? "" : "hidden "}space-y-4 rounded-xl border border-app bg-surface p-5`}>
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
            <ProductRichTextField
              label={t("products.titleLabel")}
              maxLength={500}
              value={values.translations[activeLocale].title}
              onChange={(value) => updateLocalizedValue("title", value)}
              error={errors[localeErrorKeys[activeLocale]]}
              containerClassName="md:col-span-2"
              copy={{
                bold: t("products.richText.bold"),
                italic: t("products.richText.italic"),
                strikethrough: t("products.richText.strikethrough"),
                bulletList: t("products.richText.bulletList"),
                insertText: t("products.richText.insertText"),
                preview: t("products.richText.preview"),
                hint: t("products.richText.hint"),
              }}
            />
            <ProductRichTextField
              label={t("products.descLabel")}
              maxLength={5000}
              value={values.translations[activeLocale].description}
              onChange={(value) => updateLocalizedValue("description", value)}
              multiline
              containerClassName="md:col-span-2"
              copy={{
                bold: t("products.richText.bold"),
                italic: t("products.richText.italic"),
                strikethrough: t("products.richText.strikethrough"),
                bulletList: t("products.richText.bulletList"),
                insertText: t("products.richText.insertText"),
                preview: t("products.richText.preview"),
                hint: t("products.richText.hint"),
              }}
            />
          </div>
        </section>

        <section className={`${currentStep === 1 ? "" : "hidden "}space-y-4 rounded-xl border border-app bg-surface p-5`}>
          <div>
            <h4 className="text-sm font-bold text-app">{t("products.priceSection")}</h4>
            <p className="mt-1 text-xs text-muted">{t("products.priceSectionHint")}</p>
          </div>
          <Input
            label="Наличие товара (шт.)"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={values.stock}
            onChange={(event) => updateValue("stock", event.target.value)}
            className="max-w-md"
          />
          <p className="text-xs text-muted">Если оставить 0, товар будет показан как отсутствующий или доступный по предзаказу.</p>
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
          <Input
            label="Старая цена до скидки (необязательно)"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={values.compareAtPriceUzs}
            onChange={(event) => updateValue("compareAtPriceUzs", event.target.value)}
            className="max-w-md"
          />
          <p className="text-xs text-muted">Если цена выше текущей, на витрине автоматически появится скидка.</p>
        </section>

        <section className={`${currentStep === 2 ? "" : "hidden "}space-y-4 rounded-xl border border-app bg-surface p-5`}>
          <div>
            <h4 className="text-sm font-bold text-app">Цвета товара</h4>
            <p className="mt-1 text-xs text-muted">Каждый цвет с новой строки: название | HEX. Например: Чёрный | #111111</p>
          </div>
          <label className="block max-w-2xl text-sm font-medium text-app">
            Названия и HEX-цвета
            <textarea
              value={values.colorsText}
              onChange={(event) => updateValue("colorsText", event.target.value)}
              rows={5}
              placeholder={'Чёрный | #111111\nБелый | #FFFFFF\nСиний | #234A8B'}
              className="mt-2 w-full rounded-xl border border-app bg-app px-3 py-3 font-mono text-sm text-app outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </label>
          {values.colorsText && (
            <div className="flex flex-wrap gap-2" aria-label="Предпросмотр цветов">
              {values.colorsText.split("\n").map((row, index) => {
                const [name, hex] = row.split("|").map((part) => part.trim());
                if (!name || !/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
                return <span key={`${name}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-app px-2.5 py-1 text-xs"><span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: hex }} />{name}</span>;
              })}
            </div>
          )}
        </section>

        <section className={`${currentStep === 3 ? "" : "hidden "}space-y-4 rounded-xl border border-app bg-surface p-5`}>
          <div>
            <h4 className="text-sm font-bold text-app">{t("products.photoSection")}</h4>
            <p className="mt-1 text-xs text-muted">
              {t("products.photoCount", { count: photos.length, max: Math.min(15, maxProductPhotos) })} · {t("products.photoSizeLimit", { size: maxProductPhotoSizeMb })}
            </p>
            <p className="mt-1 text-xs text-muted">{t("products.photoEditingHint")}</p>
          </div>
          {errors.photos && <p role="alert" className="text-sm text-red-500">{errors.photos}</p>}
          {photoInputErrors.map((issue, index) => <p key={`${issue}-${index}`} role="alert" className="text-sm text-red-500">{issue}</p>)}
          {photos.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <li key={photo.key} className={`relative min-w-0 overflow-hidden rounded-xl border ${index === 0 ? "border-primary-500 ring-1 ring-primary-500/30" : "border-app"}`}>
                  <div
                    className={`relative flex w-full items-center justify-center overflow-hidden bg-stone-100 dark:bg-stone-800 ${photo.file ? "touch-none cursor-grab active:cursor-grabbing" : ""} ${photoOrientations.find(({ value }) => value === photo.crop.orientation)?.aspectClass ?? "aspect-[4/5]"}`}
                    onPointerDown={(event) => {
                      if (!photo.file || event.button !== 0) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      cropDragRef.current = {
                        key: photo.key,
                        pointerId: event.pointerId,
                        clientX: event.clientX,
                        clientY: event.clientY,
                        focusX: photo.crop.x,
                        focusY: photo.crop.y,
                      };
                    }}
                    onPointerMove={(event) => {
                      const drag = cropDragRef.current;
                      if (!drag || drag.key !== photo.key || drag.pointerId !== event.pointerId) return;
                      const bounds = event.currentTarget.getBoundingClientRect();
                      if (!bounds.width || !bounds.height) return;
                      updatePhotoCrop(photo.key, {
                        x: Math.min(100, Math.max(0, drag.focusX - (event.clientX - drag.clientX) / bounds.width * 100)),
                        y: Math.min(100, Math.max(0, drag.focusY - (event.clientY - drag.clientY) / bounds.height * 100)),
                      });
                    }}
                    onPointerUp={(event) => {
                      if (cropDragRef.current?.pointerId === event.pointerId) cropDragRef.current = null;
                    }}
                    onPointerCancel={() => {
                      cropDragRef.current = null;
                    }}
                  >
                    {photo.url ? (
                      <img
                        src={photo.url}
                        alt=""
                        draggable={false}
                        onLoad={(event) => {
                          const { naturalWidth, naturalHeight } = event.currentTarget;
                          setPhotos((current) => current.map((item) => item.key === photo.key
                            ? { ...item, naturalWidth, naturalHeight }
                            : item));
                        }}
                        className={photo.file && photo.naturalWidth && productPhotoCropSignature(photo.crop) !== productPhotoCropSignature(DEFAULT_PRODUCT_PHOTO_CROP)
                          ? "absolute max-w-none select-none"
                          : "h-full w-full object-contain"}
                        style={getPhotoPreviewStyle(photo)}
                      />
                    ) : <ImageOff size={24} className="text-muted" />}
                    {index === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-bold text-white"><Star size={12} fill="currentColor" />{t("products.mainPhoto")}</span>}
                    <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white">{index + 1}</span>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="truncate text-xs text-app">{photo.file?.name ?? t("products.existingPhoto")}</p>
                    <p className="text-xs text-muted">{photo.file ? formatPhotoSize(photo.file.size) : t("products.alreadyUploaded")}</p>
                    {photo.file && (
                      <div className="space-y-3 border-t border-app pt-3">
                        <p className="text-xs font-semibold text-app">{t("products.photoCrop")}</p>
                        <div role="group" aria-label={t("products.photoOrientation")} className="grid grid-cols-3 gap-1">
                          {photoOrientations.map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              aria-pressed={photo.crop.orientation === value}
                              onClick={() => updatePhotoCrop(photo.key, { orientation: value })}
                              className={`min-w-0 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                                photo.crop.orientation === value
                                  ? "border-primary-600 bg-primary-600 text-white"
                                  : "border-app text-muted hover:bg-app hover:text-app"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <label className="block text-xs text-muted">
                          <span className="mb-1 flex justify-between gap-2">
                            <span>{t("products.photoZoom")}</span>
                            <output>{Math.round(photo.crop.zoom * 100)}%</output>
                          </span>
                          <input
                            type="range"
                            min="100"
                            max="300"
                            step="10"
                            value={Math.round(photo.crop.zoom * 100)}
                            onChange={(event) => updatePhotoCrop(photo.key, { zoom: Number(event.target.value) / 100 })}
                            className="w-full accent-primary-600"
                          />
                        </label>
                        <label className="block text-xs text-muted">
                          <span className="mb-1 flex justify-between gap-2">
                            <span>{t("products.photoFocusX")}</span>
                            <output>{photo.crop.x}%</output>
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={photo.crop.x}
                            onChange={(event) => updatePhotoCrop(photo.key, { x: Number(event.target.value) })}
                            className="w-full accent-primary-600"
                          />
                        </label>
                        <label className="block text-xs text-muted">
                          <span className="mb-1 flex justify-between gap-2">
                            <span>{t("products.photoFocusY")}</span>
                            <output>{photo.crop.y}%</output>
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={photo.crop.y}
                            onChange={(event) => updatePhotoCrop(photo.key, { y: Number(event.target.value) })}
                            className="w-full accent-primary-600"
                          />
                        </label>
                      </div>
                    )}
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

        {product && hasImageEmbeddingsCapability(capabilitiesQuery.data) && !capabilitiesQuery.isError && (
          <section className={`${currentStep === 3 ? "" : "hidden "}space-y-3 rounded-xl border border-app p-4`}>
            <div>
              <h4 className="text-sm font-bold text-app">{t("products.imageEmbeddings.title")}</h4>
              <p className="mt-1 text-xs text-muted">{t("products.imageEmbeddings.hint")}</p>
            </div>
            {imageEmbeddingQuery.isLoading ? (
              <p role="status" className="text-sm text-muted">{t("products.imageEmbeddings.loading")}</p>
            ) : imageEmbeddingQuery.isError ? (
              <p role="alert" className="text-sm text-red-500">{t("products.imageEmbeddings.statusError")}</p>
            ) : imageEmbeddingQuery.data ? (
              <div className="space-y-1 text-sm">
                <p className="text-app">
                  {t("products.imageEmbeddings.statusLabel")}:{" "}
                  <span className="font-semibold">
                    {t(`products.imageEmbeddings.status.${imageEmbeddingQuery.data.status}`)}
                  </span>
                </p>
                {imageEmbeddingQuery.data.provider && (
                  <p className="text-xs text-muted">
                    {t("products.imageEmbeddings.provider")}: {imageEmbeddingQuery.data.provider}
                  </p>
                )}
                {imageEmbeddingQuery.data.model && (
                  <p className="text-xs text-muted">
                    {t("products.imageEmbeddings.model")}: {imageEmbeddingQuery.data.model}
                  </p>
                )}
                {imageEmbeddingQuery.data.embeddingVersion && (
                  <p className="text-xs text-muted">
                    {t("products.imageEmbeddings.version")}: {imageEmbeddingQuery.data.embeddingVersion}
                  </p>
                )}
                {imageEmbeddingQuery.data.lastIndexedAt && !Number.isNaN(Date.parse(imageEmbeddingQuery.data.lastIndexedAt)) && (
                  <p className="text-xs text-muted">
                    {t("products.imageEmbeddings.lastIndexed")}:{" "}
                    {new Date(imageEmbeddingQuery.data.lastIndexedAt).toLocaleString(i18n.resolvedLanguage)}
                  </p>
                )}
              </div>
            ) : null}
            {imageEmbeddingError && <p role="alert" className="text-sm text-red-500">{imageEmbeddingError}</p>}
            {imageEmbeddingSuccess && <p role="status" className="text-sm text-emerald-600">{imageEmbeddingSuccess}</p>}
            <Button
              type="button"
              variant="outline"
              leftIcon={<RefreshCw size={16} />}
              onClick={() => void reindexImageEmbedding()}
              loading={isReindexingImage}
              disabled={isReindexingImage}
            >
              {isReindexingImage
                ? t("products.imageEmbeddings.reindexing")
                : t("products.imageEmbeddings.reindex")}
            </Button>
          </section>
        )}

        {(product?.source === "MANUAL" || !product) && (
          <section className={`${currentStep === 2 ? "" : "hidden "}space-y-4`}>
            <h4 className="text-sm font-bold text-app">{t("products.additionalInformation")}</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-app">
                  Размеры товара
                  <textarea
                    value={values.sizesText}
                    onChange={(event) => updateValue("sizesText", event.target.value)}
                    rows={3}
                    placeholder={'Для одежды: S, M, L, XL, XXL\nДля обуви: 35, 36, 37, 38, 39, 40\nДля детской: 86, 92, 98, 104'}
                    className="mt-2 w-full rounded-xl border border-app bg-app px-3 py-3 text-sm text-app outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Предпросмотр размеров">
                  {parseSizes(values.sizesText).map((size, index) => (
                    <span key={`${size}-${index}`} className="inline-flex h-10 min-w-[44px] select-none items-center justify-center rounded-md border border-app bg-surface px-3 text-sm font-medium text-app">{size}</span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <Select
                  label={t("products.sizeChartLabel")}
                  value={values.sizeChartType}
                  options={[
                    { value: "", label: t("products.sizeChartNone") },
                    { value: "CLOTHING", label: t("products.sizeChartClothing") },
                    { value: "SHOES", label: t("products.sizeChartShoes") },
                    { value: "KIDS_CLOTHING", label: t("products.sizeChartKids") },
                  ]}
                  onChange={(value) => {
                    if (value === "" || value === "CLOTHING" || value === "SHOES" || value === "KIDS_CLOTHING") {
                      updateValue("sizeChartType", value);
                    }
                  }}
                  helperText={t("products.sizeChartHint")}
                />
              </div>
            </div>
          </section>
        )}
        {product && (
          <section className={`${currentStep === 4 ? "" : "hidden "}space-y-3 rounded-xl border border-app bg-surface-muted p-4`}>
            <h4 className="text-sm font-bold text-app">{t("products.sourceInformation")}</h4>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">{t("products.sourceProvider")}</dt>
                <dd className="break-words font-medium text-app">{product.source}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t("products.sourceProductId")}</dt>
                <dd className="break-all font-mono text-app">{product.sourceProductId || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t("products.sourceTitle")}</dt>
                <dd className="break-words text-app">{product.importedFrom?.originalTitle || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t("products.sourceStatus")}</dt>
                <dd className="break-words text-app">{product.importedFrom?.status || product.status}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted">{t("products.sourceUrl")}</dt>
                <dd className="break-all text-app">
                  {product.sourceUrl && /^https?:\/\//i.test(product.sourceUrl)
                    ? <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="text-primary-600 underline">{product.sourceUrl}</a>
                    : product.sourceUrl || "—"}
                </dd>
              </div>
            </dl>
          </section>
        )}
        <section className={`${currentStep === 4 ? "" : "hidden "}space-y-3 rounded-xl border border-app p-4`}>
          <h4 className="text-sm font-bold text-app">{t("products.publicationSection")}</h4>
          <div className="flex items-center justify-between gap-4 py-2">
            <div><p className="text-sm font-medium text-app">{t("products.publishLabel")}</p><p className="mt-0.5 text-xs text-muted">Товар появится в каталоге после сохранения.</p></div>
            <button type="button" role="switch" aria-checked={values.publish} onClick={() => updateValue("publish", !values.publish)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${values.publish ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-600"}`}><span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow transition duration-200 ${values.publish ? "translate-x-5" : "translate-x-0"}`} /></button>
          </div>
          <div>
            <div className="flex items-center justify-between gap-4 py-2">
              <div><p className="text-sm font-medium text-app">{t("products.telegram.publishLabel")}</p><p className="mt-0.5 text-xs text-muted">Публикация выполняется после успешного сохранения товара.</p></div>
              <button type="button" role="switch" aria-checked={values.publishTelegram} disabled={!values.publish || !capabilitiesQuery.data?.telegramProductPublish} onClick={() => updateValue("publishTelegram", !values.publishTelegram)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 ${values.publishTelegram ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-600"}`}><span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow transition duration-200 ${values.publishTelegram ? "translate-x-5" : "translate-x-0"}`} /></button>
            </div>
            {!capabilitiesQuery.isLoading && !capabilitiesQuery.isError && (
              <p className="ml-6 mt-1 text-xs text-muted">
                {!capabilitiesQuery.data?.telegramProductPublishFeatureEnabled
                  ? t("products.telegram.featureDisabled")
                  : !capabilitiesQuery.data.telegramProductPublishConfigured
                    ? t("products.telegram.notConfigured")
                    : !values.publish
                      ? t("products.telegram.storefrontRequired")
                      : ""}
              </p>
            )}
            {capabilitiesQuery.isLoading && (
              <p className="ml-6 mt-1 text-xs text-muted">{t("products.telegram.loading")}</p>
            )}
            {capabilitiesQuery.isError && (
              <p role="alert" className="ml-6 mt-1 text-xs text-red-600">{t("products.telegram.statusError")}</p>
            )}
          </div>
          {telegramPublishError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              <span>{t("products.telegram.savedButFailed")}</span>
              <Button type="button" variant="outline" onClick={onRetryTelegram} loading={isRetryingTelegram}>
                {t("products.telegram.retry")}
              </Button>
            </div>
          )}
        </section>
      </form>
    </Modal>
  );
}
