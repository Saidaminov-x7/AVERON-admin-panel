import { Suspense, lazy, useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { ChevronDown, ImageOff, MoveDown, MoveUp, RefreshCw, Sparkles, Star, Trash2, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Modal, Select, Switch } from "../../components/ui";
import { CountryFlag } from "../../components/commerce/CountryFlag";
import { LanguageFlag } from "../../components/ui/LanguageFlag";
import { Dropdown } from "../../components/Dropdown";
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
  getFirstProductValidationStep,
  normalizeProductSizes,
  PRODUCT_VALIDATION_FIELDS,
  reorderItem,
  validateProductDraft,
  type ProductValidationCode,
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

const ProductFittingRoomPanel = lazy(() => import("./ProductFittingRoomPanel").then((module) => ({ default: module.ProductFittingRoomPanel })));

type LocalizedContent = { title: string; description: string; composition: string; careInstructions: string };
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
type PhotoInputError =
  | { code: "invalidType"; name: string }
  | { code: "tooLarge"; name: string; size: number }
  | { code: "duplicate" }
  | { code: "limit"; max: number }
  | { code: "sizeChartInvalid" }
  | { code: "cropError" };

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
  variantStockOverrides: Record<string, string>;
  colorsText: string;
  color: string;
  size: string;
  sizesText: string;
  sizeChartType: "" | "CLOTHING" | "SHOES" | "KIDS_CLOTHING";
  sizeChartText: string;
  publish: boolean;
  publishTelegram: boolean;
};
type FormErrors = Partial<Record<ProductValidationField, ProductValidationCode>>;

export type ProductFormSubmission = {
  title: string;
  titleUz: string;
  titleEn: string;
  description: string;
  descriptionUz: string;
  descriptionEn: string;
  composition: string;
  compositionUz: string;
  compositionEn: string;
  careInstructions: string;
  careInstructionsUz: string;
  careInstructionsEn: string;
  sourceUrl?: string;
  salePriceUzs: number;
  stock: number;
  variantStocks: Array<{ color: string | null; size: string | null; stock: number }> | null;
  variantMatrixChanged: boolean;
  compareAtPriceUzs: number | null;
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  country?: ProductCountry;
  categoryId?: string | null;
  color: string;
  size: string;
  sizeChartType: ProductFormValues["sizeChartType"];
  sizeChart?: Array<Record<string, string | number>>;
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

const readLocalizedAttribute = (product: ProductListItem, name: "composition" | "careInstructions", locale: ProductLocale): string => {
  const value = product.attributes?.[name];
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const localized = value as Record<string, unknown>;
  const text = localized[locale] ?? localized.text ?? localized.value;
  return typeof text === "string" ? text : "";
};

const getInitialValues = (product: ProductListItem | null): ProductFormValues => ({
  translations: {
    ru: { title: product ? readTitle(product, "ru") : "", description: product ? readDescription(product, "ru") : "", composition: product ? readLocalizedAttribute(product, "composition", "ru") : "", careInstructions: product ? readLocalizedAttribute(product, "careInstructions", "ru") : "" },
    uz: { title: product ? readTitle(product, "uz") : "", description: product ? readDescription(product, "uz") : "", composition: product ? readLocalizedAttribute(product, "composition", "uz") : "", careInstructions: product ? readLocalizedAttribute(product, "careInstructions", "uz") : "" },
    en: { title: product ? readTitle(product, "en") : "", description: product ? readDescription(product, "en") : "", composition: product ? readLocalizedAttribute(product, "composition", "en") : "", careInstructions: product ? readLocalizedAttribute(product, "careInstructions", "en") : "" },
  },
  country: product?.country ?? "",
  categoryId: product?.categoryId ?? "",
  salePriceUzs: product ? String(product.salePriceUzs) : "",
  compareAtPriceUzs: product?.compareAtPriceUzs ? String(product.compareAtPriceUzs) : "",
  stock: product?.variants?.[0]?.stock !== undefined ? String(product.variants[0].stock) : "0",
  variantStockOverrides: Object.fromEntries((product?.variants ?? []).map((variant) => [
    `${variant.color ?? ""}::${variant.size ?? ""}`,
    String(variant.stock ?? 0),
  ])),
  colorsText: product?.variants?.map((variant) => {
    const [name, hex] = (variant.color ?? "").split("::");
    return hex ? `${name} | ${hex}` : "";
  }).filter(Boolean).join("\n") ?? "",
  color: product?.source === "MANUAL" ? product.variants?.[0]?.color ?? "" : "",
  size: product?.source === "MANUAL" ? product.variants?.[0]?.size ?? "" : "",
  sizesText: product?.variants?.map((variant) => variant.size).filter(Boolean).join(", ") ?? "",
  sizeChartType: product?.sizeChartType ?? "",
  sizeChartText: product?.sizeChart ? JSON.stringify(product.sizeChart, null, 2) : "",
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
  const steps = ["products.mainInformation", "products.pricing", "products.variants", "products.photos", "products.fittingRoom.step", "products.publicationSection"];
  const [values, setValues] = useState<ProductFormValues>(() => getInitialValues(product));
  const [photos, setPhotos] = useState<PhotoDraft[]>(() => (product?.images ?? []).map((image) => ({
    key: `existing-${image.id}`,
    id: image.id,
    mediaId: image.mediaId,
    url: image.url,
    crop: { ...DEFAULT_PRODUCT_PHOTO_CROP },
  })));
  const [errors, setErrors] = useState<FormErrors>({});
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const shouldFocusErrorSummaryRef = useRef(false);
  const [photoInputErrors, setPhotoInputErrors] = useState<PhotoInputError[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isPreparingImages, setIsPreparingImages] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<ProductAiSuggestionsResponse | null>(null);
  const [aiError, setAiError] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isReindexingImage, setIsReindexingImage] = useState(false);
  const [imageEmbeddingError, setImageEmbeddingError] = useState("");
  const [imageEmbeddingSuccess, setImageEmbeddingSuccess] = useState("");
  const aiRequestRef = useRef<AbortController | null>(null);
  const submitInFlightRef = useRef(false);

  useEffect(() => {
    if (!shouldFocusErrorSummaryRef.current) return;
    shouldFocusErrorSummaryRef.current = false;
    errorSummaryRef.current?.focus();
    errorSummaryRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentStep, errors]);

  const capabilitiesQuery = useAdminCapabilities(isOpen);
  const telegramDefaultAppliedRef = useRef(false);
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

  // Reset draft state only when opening/closing the modal or switching product identity.
  // oxlint-disable react/set-state-in-effect, react-hooks/exhaustive-deps
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
  }, [isOpen, product?.id, releaseObjectUrls]);

  // Apply the configured Telegram default once after capabilities load; edits stay opt-in to avoid duplicate posts.
  useEffect(() => {
    if (!isOpen) {
      telegramDefaultAppliedRef.current = false;
      return;
    }
    const capabilitiesSettled = capabilitiesQuery.isError || (
      capabilitiesQuery.data !== undefined
      && !capabilitiesQuery.isLoading
      && !capabilitiesQuery.isFetching
    );
    if (product?.id || telegramDefaultAppliedRef.current || !capabilitiesSettled) return;

    telegramDefaultAppliedRef.current = true;
    setValues((current) => ({
      ...current,
      publishTelegram: capabilitiesQuery.data?.telegramProductPublish === true,
    }));
  }, [isOpen, product?.id, capabilitiesQuery.data?.telegramProductPublish, capabilitiesQuery.data, capabilitiesQuery.isLoading, capabilitiesQuery.isFetching, capabilitiesQuery.isError]);
  // oxlint-enable react/set-state-in-effect, react-hooks/exhaustive-deps

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

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const issues: PhotoInputError[] = [];
    const maxSize = Math.min(25, Math.max(1, maxProductPhotoSizeMb)) * 1024 * 1024;
    const maxCount = Math.min(15, Math.max(1, maxProductPhotos));
    const knownFiles = new Set(photos.flatMap((photo) => photo.file ? [fileIdentity(photo.file)] : []));
    const additions: PhotoDraft[] = [];

    for (const file of selectedFiles) {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
        issues.push({ code: "invalidType", name: file.name });
        continue;
      }
      if (file.size > maxSize) {
        issues.push({ code: "tooLarge", name: file.name, size: maxProductPhotoSizeMb });
        continue;
      }
      const identity = fileIdentity(file);
      if (knownFiles.has(identity)) {
        issues.push({ code: "duplicate" });
        continue;
      }
      if (photos.length + additions.length >= maxCount) {
        issues.push({ code: "limit", max: maxCount });
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
      translations: Object.fromEntries(locales.map((locale) => [
        locale,
        { ...current.translations[locale], ...result.translations[locale] },
      ])) as Record<ProductLocale, LocalizedContent>,
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
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (submitter?.getAttribute("type") !== "submit") return;
    if (isPreparingImages || isSaving || submitInFlightRef.current) return;
    // A submit event must never publish from an intermediate step. This guard
    // keeps the stepper safe even if a browser or wrapper treats "Далее" as submit.
    if (currentStep < steps.length - 1) {
      setCurrentStep((step) => Math.min(steps.length - 1, step + 1));
      return;
    }
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
      colorsText: values.colorsText,
    }, isProductCountry);
    for (const field of PRODUCT_VALIDATION_FIELDS) {
      const code = validationCodes[field];
      if (code) nextErrors[field] = code;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstMissingLocale = locales.find((locale) => nextErrors[localeErrorKeys[locale]]);
      if (firstMissingLocale) setActiveLocale(firstMissingLocale);
      const firstInvalidStep = getFirstProductValidationStep(validationCodes);
      if (firstInvalidStep !== null) setCurrentStep(firstInvalidStep);
      shouldFocusErrorSummaryRef.current = true;
      return;
    }

    let sizeChart: Array<Record<string, string | number>> = [];
    try {
      const parsed: unknown = values.sizeChartText.trim() ? JSON.parse(values.sizeChartText) : [];
      if (!Array.isArray(parsed) || parsed.some((row) => !row || typeof row !== "object" || typeof row.size !== "string")) throw new Error("invalid chart");
      sizeChart = parsed as Array<Record<string, string | number>>;
    } catch {
      setPhotoInputErrors([{ code: "sizeChartInvalid" }]);
      setCurrentStep(2);
      return;
    }

    submitInFlightRef.current = true;
    setIsPreparingImages(true);
    setPhotoInputErrors([]);
    try {
      const images: ProductFormSubmission["images"] = [];
      for (const photo of photos) {
        const signature = productPhotoCropSignature(photo.crop);
        if (photo.id && !photo.file) {
          images.push({ id: photo.id });
        } else if (photo.mediaId && (!photo.file || photo.mediaCropSignature === signature)) {
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
        composition: values.translations.ru.composition.trim(),
        compositionUz: values.translations.uz.composition.trim(),
        compositionEn: values.translations.en.composition.trim(),
        careInstructions: values.translations.ru.careInstructions.trim(),
        careInstructionsUz: values.translations.uz.careInstructions.trim(),
        careInstructionsEn: values.translations.en.careInstructions.trim(),
        salePriceUzs: Number(values.salePriceUzs),
        stock: Math.max(0, Math.floor(Number(values.stock || 0))),
        variantStocks: (() => {
          const colors = values.colorsText.split("\n").map((row) => {
            const [name, rawHex] = row.split("|").map((part) => part.trim());
            const hex = rawHex || name;
            return name && /^#[0-9a-fA-F]{6}$/.test(hex ?? "")
              ? `${name}::${hex.toUpperCase()}`
              : null;
          }).filter((color): color is string => Boolean(color));
          const sizes = normalizeProductSizes(values.sizesText);
          if (!colors.length && !sizes.length) return null;
          const colorOptions = colors.length ? colors : [null];
          const sizeOptions = sizes.length ? sizes : [null];
          return colorOptions.flatMap((color) => sizeOptions.map((size) => {
            const stockKey = `${color ?? ""}::${size ?? ""}`;
            const stockValue = values.variantStockOverrides[stockKey] ?? values.stock;
            return { color, size, stock: Math.max(0, Math.floor(Number(stockValue || 0))) };
          }));
        })(),
        variantMatrixChanged: !product || values.colorsText !== (product.variants?.map((variant) => {
          const [name, hex] = (variant.color ?? "").split("::");
          return hex ? `${name} | ${hex}` : "";
        }).filter(Boolean).join("\n") || "") || normalizeProductSizes(values.sizesText).join(", ") !== normalizeProductSizes(product.variants?.map((variant) => variant.size).filter(Boolean).join(", ") ?? "").join(", "),
        compareAtPriceUzs: values.compareAtPriceUzs ? Number(values.compareAtPriceUzs) : null,
        colors: values.colorsText.split("\n").map((row, index) => {
          const [name, hex] = row.split("|").map((part) => part.trim());
          const normalizedHex = name && !hex && /^#[0-9a-fA-F]{6}$/.test(name) ? name : hex;
          return { name: hex ? name : t("products.colorFallback", { number: index + 1 }), hex: normalizedHex };
        }).filter((item) => item.name && /^#[0-9a-fA-F]{6}$/.test(item.hex)),
        country: isProductCountry(values.country) ? values.country : undefined,
        categoryId: values.categoryId || null,
        color: values.color.trim(),
        size: normalizeProductSizes(values.sizesText).join(", ") || values.size.trim(),
        sizes: normalizeProductSizes(values.sizesText),
        sizeChartType: values.sizeChartType,
        sizeChart,
        publish: values.publish,
        publishTelegram: values.publishTelegram,
        images,
      });
    } catch {
      setPhotoInputErrors([{ code: "cropError" }]);
    } finally {
      submitInFlightRef.current = false;
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
    colors: t("products.productColors"),
  };
  const getValidationMessage = (code?: ProductValidationCode): string | undefined => {
    if (!code) return undefined;
    switch (code) {
      case "title": return t("products.validationTitleLocale");
      case "country": return t("products.countryRequired");
      case "salePriceUzs": return t("products.validationSalePrice");
      case "photos": return t("products.validationPhotos");
      case "photoCount": return t("products.photoLimitReached", { max: Math.min(15, maxProductPhotos) });
      case "photoSize": return t("products.photoSizeLimit", { size: maxProductPhotoSizeMb });
      case "color": return t("products.colorNameRequired");
    }
  };
  const getPhotoInputErrorMessage = (issue: PhotoInputError): string => {
    switch (issue.code) {
      case "invalidType": return t("products.photoInvalidType", { name: issue.name });
      case "tooLarge": return t("products.photoTooLarge", { name: issue.name, size: issue.size });
      case "duplicate": return t("products.duplicatePhoto");
      case "limit": return t("products.photoLimitReached", { max: issue.max });
      case "sizeChartInvalid": return t("products.sizeChartInvalid");
      case "cropError": return t("products.photoCropError");
    }
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
    <Select
      label={t("products.contentLanguage")}
      value={activeLocale}
      onChange={(value) => { if (locales.includes(value as ProductLocale)) setActiveLocale(value as ProductLocale); }}
      options={locales.map((locale) => ({
        value: locale,
        label: localeName(locale),
        description: errors[localeErrorKeys[locale]] ? t("products.translationError") : values.translations[locale].title.trim().length >= 2 ? t("products.translationComplete") : t("products.translationIncomplete"),
        icon: <LanguageFlag locale={locale} className="h-4 w-6" />,
      }))}
      containerClassName="w-full sm:w-56"
    />
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
          {currentStep > 0 && <Button type="button" variant="outline" onClick={() => setCurrentStep((step) => step - 1)} disabled={isSaving || isPreparingImages}>{t("products.previousStep")}</Button>}
          {currentStep < steps.length - 1 ? <Button type="button" onClick={() => setCurrentStep((step) => step + 1)}>{t("products.nextStep")}</Button> : <Button type="submit" form={formId} loading={isSaving || isPreparingImages} disabled={settingsLoading || isPreparingImages}>
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
          <div className="flex gap-1" aria-label="Шаги создания товара">{steps.map((step, index) => <button key={step} type="button" onClick={() => setCurrentStep(index)} aria-label={t(step)} aria-current={index === currentStep ? "step" : undefined} className="group flex min-h-0 flex-1 items-center rounded-full bg-transparent p-0"><span className={`h-1 w-full rounded-full transition-colors ${index <= currentStep ? "bg-primary-600" : "bg-surface-soft dark:bg-surface-soft group-hover:bg-surface-soft dark:group-hover:bg-surface-soft"}`} /></button>)}</div>
          <div className="flex items-center justify-between text-xs text-muted"><span>Шаг {currentStep + 1} из {steps.length}</span><span className="font-medium text-app">{t(steps[currentStep])}</span></div>
        </div>
        <div className="rounded-xl border border-app bg-surface-secondary p-4">
          <p className="text-sm font-bold text-app">{product ? t("products.wizardEditTitle") : t("products.wizardCreateTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{t("products.workflowHint")}</p>
        </div>
        {submissionError && (
          <div role="alert" className="rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-error">
            {submissionError}
          </div>
        )}
        {submitAttempted && Object.keys(errors).length > 0 && (
          <div role="alert" className="rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-error">
            <p className="font-semibold">{t("products.formHasErrors")}</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {Object.entries(errors).map(([field, message]) => message && (
                <li key={field}><strong>{errorLabels[field as keyof FormErrors]}:</strong> {getValidationMessage(message)}</li>
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
              error={getValidationMessage(errors.country)}
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
          {aiError && <p role="alert" className="text-sm text-error">{aiError}</p>}
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
          <div id={`${formId}-panel`} role="region" aria-label={`${t("products.contentLanguage")}: ${localeName(activeLocale)}`} className="grid gap-4 md:grid-cols-2">
            <ProductRichTextField
              label={t("products.titleLabel")}
              maxLength={500}
              value={values.translations[activeLocale].title}
              onChange={(value) => updateLocalizedValue("title", value)}
              error={getValidationMessage(errors[localeErrorKeys[activeLocale]])}
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
            <ProductRichTextField
              label={t("products.compositionLabel")}
              maxLength={2000}
              value={values.translations[activeLocale].composition}
              onChange={(value) => updateLocalizedValue("composition", value)}
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
            <ProductRichTextField
              label={t("products.careInstructionsLabel")}
              maxLength={3000}
              value={values.translations[activeLocale].careInstructions}
              onChange={(value) => updateLocalizedValue("careInstructions", value)}
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
          <p className="text-sm text-muted">{t("products.sizeStockHint")}</p>
          <Input
            label={t("products.salePriceLabel")}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={values.salePriceUzs}
            onChange={(event) => updateValue("salePriceUzs", event.target.value)}
            error={getValidationMessage(errors.salePriceUzs)}
            className="max-w-md"
          />
          <Input
            label={t("products.oldPriceLabel")}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={values.compareAtPriceUzs}
            onChange={(event) => updateValue("compareAtPriceUzs", event.target.value)}
            className="max-w-md"
          />
          <p className="text-xs text-muted">{t("products.oldPriceHint")}</p>
        </section>

        <section className={`${currentStep === 2 ? "" : "hidden "}space-y-4 rounded-xl border border-app bg-surface p-5`}>
          <div>
            <h4 className="text-sm font-bold text-app">{t("products.colorsTitle")}</h4>
            <p className="mt-1 text-xs text-muted">{t("products.colorsHint")}</p>
          </div>
          <div className="space-y-2">
            {values.colorsText.split("\n").map((row, rowIndex) => ({ row, rowIndex })).filter(({ row }) => row.trim()).map(({ row, rowIndex }) => {
              const [rawName, rawHex] = row.split("|").map((part) => part.trim());
              const name = rawName || t("products.colorFallback", { number: rowIndex + 1 });
              const hex = /^#[0-9a-fA-F]{6}$/.test(rawHex ?? "") ? rawHex.toUpperCase() : /^#[0-9a-fA-F]{6}$/.test(rawName ?? "") ? rawName.toUpperCase() : "#808080";
              const rows = values.colorsText.split("\n");
              const displayHex = rawHex ?? rawName;
              const hexInput = /^#[0-9a-fA-F]{0,6}$/.test(displayHex ?? "") ? displayHex : hex;
              const updateRow = (nextName: string, nextHex: string) => {
                rows[rowIndex] = `${nextName} | ${nextHex.toUpperCase()}`;
                updateValue("colorsText", rows.join("\n"));
              };
              return <div key={`${rowIndex}-${name}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-app bg-app p-3 sm:grid-cols-[auto_minmax(0,1fr)_8.5rem_auto]">
                <label className="relative row-span-2 size-10 cursor-pointer overflow-hidden rounded-full border border-app shadow-sm sm:row-span-1" title={`Выбрать цвет ${name}`}>
                  <span className="absolute inset-0" style={{ backgroundColor: hex }} />
                  <input aria-label={t("products.chooseColor", { name })} type="color" value={hex} onChange={(event) => updateRow(rawName, event.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
                </label>
                <input aria-label={t("products.colorName", { number: rowIndex + 1 })} value={rawName} onChange={(event) => updateRow(event.target.value, hex)} placeholder={t("products.colorExample")} className="h-10 min-w-0 rounded-md border border-app bg-surface px-3 text-sm text-app outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
                <div className="relative col-start-2 sm:col-start-auto">
                  <input aria-label={t("products.hexColor", { name })} value={hexInput} maxLength={7} onChange={(event) => { const next = event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`; if (/^#[0-9a-fA-F]{0,6}$/.test(next)) updateRow(rawName, next); }} onBlur={() => { if (!/^#[0-9a-fA-F]{6}$/.test(hexInput)) updateRow(rawName, "#808080"); }} className="h-10 w-full rounded-md border border-app bg-surface px-2 font-mono text-sm uppercase text-app outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <button type="button" aria-label={`Удалить цвет ${name}`} onClick={() => updateValue("colorsText", values.colorsText.split("\n").filter((_, index) => index !== rowIndex).join("\n"))} className="row-span-2 inline-flex size-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-soft hover:text-error sm:row-span-1"><Trash2 size={16} /></button>
              </div>;
            })}
            <button type="button" onClick={() => updateValue("colorsText", [values.colorsText, " | #808080"].filter(Boolean).join("\n"))} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-dashed border-app px-3 text-sm font-semibold text-app transition-colors hover:bg-app"><span aria-hidden="true">+</span> {t("products.addColor")}</button>
          </div>
        </section>

        <section className={`${currentStep === 3 ? "" : "hidden "}space-y-4 rounded-xl border border-app bg-surface p-5`}>
          <div>
            <h4 className="text-sm font-bold text-app">{t("products.photoSection")}</h4>
            <p className="mt-1 text-xs text-muted">
              {t("products.photoCount", { count: photos.length, max: Math.min(15, maxProductPhotos) })} · {t("products.photoSizeLimit", { size: maxProductPhotoSizeMb })}
            </p>
            <p className="mt-1 text-xs text-muted">{t("products.photoEditingHint")}</p>
          </div>
          {errors.photos && <p role="alert" className="text-sm text-error">{errors.photos}</p>}
          {photoInputErrors.map((issue, index) => <p key={`${issue}-${index}`} role="alert" className="text-sm text-error">{issue}</p>)}
          {photos.length > 0 && (
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo, index) => (
                <li key={photo.key} className={`relative min-w-0 overflow-hidden rounded-xl border ${index === 0 ? "border-primary-500 ring-1 ring-primary-500/30" : "border-app"}`}>
                  <div
                    className={`relative flex w-full items-center justify-center overflow-hidden bg-surface-soft dark:bg-surface-soft ${photo.file ? "touch-none cursor-grab active:cursor-grabbing" : ""} ${photoOrientations.find(({ value }) => value === photo.crop.orientation)?.aspectClass ?? "aspect-[4/5]"}`}
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
                    {index === 0 && <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-xs font-bold text-white"><Star size={12} fill="currentColor" />{t("products.mainPhoto")}</span>}
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
                              className={`min-w-0 rounded-lg border px-2 py-2 text-[length:var(--font-size-caption)] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
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
                      <button type="button" onClick={() => removePhoto(photo)} aria-label={t("products.removePhoto")} className="rounded-lg p-2 text-error hover:bg-surface-soft"><Trash2 size={16} /></button>
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
              <p role="alert" className="text-sm text-error">{t("products.imageEmbeddings.statusError")}</p>
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
            {imageEmbeddingError && <p role="alert" className="text-sm text-error">{imageEmbeddingError}</p>}
            {imageEmbeddingSuccess && <p role="status" className="text-sm text-success">{imageEmbeddingSuccess}</p>}
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
                  {t("products.sizesTitle")}
                  <textarea
                    value={values.sizesText}
                    onChange={(event) => updateValue("sizesText", event.target.value)}
                    rows={3}
                    placeholder={t("products.sizesPlaceholder")}
                    className="mt-2 w-full rounded-xl border border-app bg-app px-3 py-3 text-sm text-app outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2" aria-label={t("products.sizesPreview")}>
                  {normalizeProductSizes(values.sizesText).map((size, index) => (
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-app">
                  {t("products.sizeChartDataLabel")}
                  <textarea value={values.sizeChartText} onChange={(event) => updateValue("sizeChartText", event.target.value)} rows={8} placeholder={'[{"size":"M","chestCm":92,"recommendedHeightMinCm":165,"recommendedHeightMaxCm":175,"recommendedWeightMinKg":55,"recommendedWeightMaxKg":68}]'} className="mt-2 w-full rounded-xl border border-app bg-app px-3 py-3 font-mono text-xs text-app" />
                </label>
                <p className="mt-1 text-xs text-muted">{t("products.sizeChartDataHint")}</p>
              </div>
            </div>
          </section>
        )}
        {(product?.source === "MANUAL" || !product) && (
          <section className={`${currentStep === 2 ? "" : "hidden "}space-y-4 rounded-xl border border-app bg-surface p-5`}>
            <div>
              <h4 className="text-sm font-bold text-app">{t("products.stockByVariantTitle")}</h4>
              <p className="mt-1 text-xs text-muted">{t("products.stockByVariantHint")}</p>
            </div>
            {(() => {
              const colors = values.colorsText.split("\n").map((row) => {
                const [name, rawHex] = row.split("|").map((part) => part.trim());
                const hex = rawHex || name;
                return name && /^#[0-9a-fA-F]{6}$/.test(hex ?? "") ? `${name}::${hex.toUpperCase()}` : null;
              }).filter((color): color is string => Boolean(color));
              const sizes = normalizeProductSizes(values.sizesText);
              const colorOptions = colors.length ? colors : [null];
              const sizeOptions = sizes.length ? sizes : [null];
              if (!colors.length && !sizes.length) {
                return <Input label={t("products.stockLabel")} type="number" min="0" max="2147483647" step="1" inputMode="numeric" value={values.stock} onChange={(event) => updateValue("stock", event.target.value)} className="max-w-md" />;
              }
              const parsedStock = (raw: string | undefined) => {
                const number = Number(raw ?? values.stock ?? 0);
                return Number.isSafeInteger(number) ? Math.max(0, Math.min(number, 2_147_483_647)) : 0;
              };
              return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {colorOptions.flatMap((color) => sizeOptions.map((size) => {
                  const key = `${color ?? ""}::${size ?? ""}`;
                  const stock = values.variantStockOverrides[key] ?? values.stock;
                  const label = [color?.split("::")[0], size].filter(Boolean).join(" · ") || t("products.standardVariant");
                  return <Input key={key} label={`${label} — ${t("products.stockUnits")}`} type="number" min="0" max="2147483647" step="1" inputMode="numeric" value={stock} onChange={(event) => {
                    const value = event.target.value;
                    if (value !== "" && !/^\d{1,10}$/.test(value)) return;
                    updateValue("variantStockOverrides", { ...values.variantStockOverrides, [key]: value });
                  }} onBlur={() => updateValue("variantStockOverrides", { ...values.variantStockOverrides, [key]: String(parsedStock(stock)) })} />;
                }))}
              </div>;
            })()}
          </section>
        )}
        {product && (
          <section className={`${currentStep === 5 ? "" : "hidden "}space-y-3 rounded-xl border border-app bg-surface-muted p-4`}>
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
        {currentStep === 4 && <section className="space-y-3">
          <Suspense fallback={<p role="status" className="text-sm text-muted">{t("products.fittingRoom.loading")}</p>}>
            <ProductFittingRoomPanel productId={product?.id ?? null} variants={product?.variants ?? []} />
          </Suspense>
        </section>}
        <section className={`${currentStep === 5 ? "" : "hidden "}space-y-3 rounded-xl border border-app p-4`}>
          <h4 className="text-sm font-bold text-app">{t("products.publicationSection")}</h4>
          <div className="flex items-center justify-between gap-4 py-2">
            <div><p className="text-sm font-medium text-app">{t("products.publishLabel")}</p><p className="mt-1 text-xs text-muted">Товар появится в каталоге после сохранения.</p></div>
            <button type="button" role="switch" aria-checked={values.publish} onClick={() => updateValue("publish", !values.publish)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${values.publish ? "bg-primary-600" : "bg-surface-soft dark:bg-surface-soft"}`}><span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow transition duration-200 ${values.publish ? "translate-x-5" : "translate-x-0"}`} /></button>
          </div>
          <div>
            <div className="flex items-center justify-between gap-4 py-2">
              <div><p className="text-sm font-medium text-app">{t("products.telegram.publishLabel")}</p><p className="mt-1 text-xs text-muted">Публикация выполняется после успешного сохранения товара.</p></div>
              <button type="button" role="switch" aria-checked={values.publishTelegram} disabled={!values.publish || !capabilitiesQuery.data?.telegramProductPublish} onClick={() => updateValue("publishTelegram", !values.publishTelegram)} className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-40 ${values.publishTelegram ? "bg-primary-600" : "bg-surface-soft dark:bg-surface-soft"}`}><span className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow transition duration-200 ${values.publishTelegram ? "translate-x-5" : "translate-x-0"}`} /></button>
            </div>
            {!capabilitiesQuery.isLoading && !capabilitiesQuery.isError && (
              <p id={`${formId}-telegram-status`} className="ml-6 mt-1 text-xs text-muted">
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
              <p id={`${formId}-telegram-status`} className="ml-6 mt-1 text-xs text-muted">{t("products.telegram.loading")}</p>
            )}
            {capabilitiesQuery.isError && (
              <p role="alert" className="ml-6 mt-1 text-xs text-error">{t("products.telegram.statusError")}</p>
            )}
          </div>
          {telegramPublishError && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-soft p-3 text-sm text-error dark:text-error">
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
