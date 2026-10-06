import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RotateCcw, Archive } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { Button, Input, Modal, Select } from "../../components/ui";
import {
  archiveProductCategory,
  createProductCategory,
  getProductCategories,
  updateProductCategory,
  type ProductCategory,
  type ProductLocale,
} from "../../lib/commerceApi";

type CategoryValues = {
  names: Record<ProductLocale, string>;
  parentId: string;
  sortOrder: string;
  imageUrl: string;
};

const emptyValues: CategoryValues = {
  names: { ru: "", uz: "", en: "" },
  parentId: "",
  sortOrder: "0",
  imageUrl: "",
};

const localizedName = (category: ProductCategory, locale: string) => {
  if (typeof category.name === "string") return category.name;
  return category.name[locale] || category.name.ru || category.name.en || category.slug;
};

export default function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [values, setValues] = useState<CategoryValues>(emptyValues);
  const categoriesQuery = useQuery({
    queryKey: ["admin", "commerce-categories"],
    queryFn: getProductCategories,
  });
  const categories = categoriesQuery.data ?? [];
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "commerce-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["commerce-product-categories"] });
  };
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: {
          ru: values.names.ru.trim(),
          uz: values.names.uz.trim(),
          en: values.names.en.trim(),
        },
        parentId: values.parentId || null,
        sortOrder: Number(values.sortOrder) || 0,
        imageUrl: values.imageUrl.trim() || null,
      };
      return editing
        ? updateProductCategory(editing.id, payload)
        : createProductCategory(payload);
    },
    onSuccess: () => {
      toast.success(t("categories.saved"));
      closeForm();
      invalidate();
    },
    onError: (error: unknown) => {
      const responseError = error as { response?: { data?: { message?: unknown } } };
      const message = responseError.response?.data?.message;
      toast.error(typeof message === "string" ? message : t("categories.saveError"));
    },
  });
  const archiveMutation = useMutation({
    mutationFn: ({ category, active }: { category: ProductCategory; active: boolean }) =>
      active ? updateProductCategory(category.id, { active: true }) : archiveProductCategory(category.id),
    onSuccess: (_result, { active }) => {
      toast.success(active ? t("categories.saved") : t("categories.archived"));
      invalidate();
    },
    onError: () => toast.error(t("categories.saveError")),
  });

  const openCreate = () => {
    setEditing(null);
    setValues(emptyValues);
    setIsFormOpen(true);
  };
  const openEdit = (category: ProductCategory) => {
    const name = typeof category.name === "string" ? { ru: category.name, uz: category.name, en: category.name } : category.name;
    setEditing(category);
    setValues({
      names: {
        ru: name.ru ?? "",
        uz: name.uz ?? "",
        en: name.en ?? "",
      },
      parentId: category.parentId ?? "",
      sortOrder: String(category.sortOrder ?? 0),
      imageUrl: category.imageUrl ?? "",
    });
    setIsFormOpen(true);
  };
  const closeForm = () => {
    setEditing(null);
    setValues(emptyValues);
    setIsFormOpen(false);
  };
  const updateName = (locale: ProductLocale, value: string) => {
    setValues((current) => ({ ...current, names: { ...current.names, [locale]: value } }));
  };

  const parentOptions = [
    { value: "", label: t("categories.root") },
    ...categories
      .filter((category) => category.active !== false && category.id !== editing?.id)
      .map((category) => ({ value: category.id, label: localizedName(category, i18n.language.slice(0, 2)) })),
  ];

  return (
    <Layout title={t("categories.page")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary-500">{t("sidebar.section.products")}</p>
          <h1 className="text-2xl font-black">{t("categories.title")}</h1>
        </div>
        <Button leftIcon={<Plus size={17} />} onClick={openCreate}>{t("categories.add")}</Button>
      </div>

      {categoriesQuery.isLoading ? (
        <div className="card">{t("products.loading")}</div>
      ) : categoriesQuery.isError ? (
        <div role="alert" className="card text-red-500">{t("categories.loadError")}</div>
      ) : categories.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <article key={category.id} className="card min-w-0 space-y-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-bold">{localizedName(category, i18n.language.slice(0, 2))}</h2>
                  <p className="mt-1 break-all text-xs text-muted">{category.slug}</p>
                  {category.parentId && (
                    <p className="mt-2 truncate text-xs text-muted">
                      {t("categories.parent")}: {localizedName(categories.find((item) => item.id === category.parentId) ?? category, i18n.language.slice(0, 2))}
                    </p>
                  )}
                </div>
                <span className={category.active === false ? "badge-neutral" : "badge-success"}>
                  {t(category.active === false ? "categories.inactive" : "categories.active")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-app pt-3">
                <span className="text-xs text-muted">
                  {t("categories.productsCount")}: {category._count?.products ?? 0}
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => navigate(`/products?category=${encodeURIComponent(category.slug)}`)} className="btn-ghost text-xs">
                    {t("categories.viewProducts")}
                  </button>
                  <button type="button" onClick={() => openEdit(category)} className="btn-ghost" aria-label={t("categories.edit")}><Pencil size={16} /></button>
                  {category.active === false ? (
                    <button type="button" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate({ category, active: true })} className="btn-ghost" aria-label={t("categories.restore")}><RotateCcw size={16} /></button>
                  ) : (
                    <button type="button" disabled={archiveMutation.isPending} onClick={() => archiveMutation.mutate({ category, active: false })} className="btn-ghost text-red-500" aria-label={t("categories.archive")}><Archive size={16} /></button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card text-muted">{t("categories.empty")}</div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={t(editing ? "categories.edit" : "categories.add")}
        size="lg"
        fullscreenOnMobile
        closeLabel={t("common.close")}
        footer={
          <>
            <Button variant="ghost" onClick={closeForm} disabled={saveMutation.isPending}>{t("categories.cancel")}</Button>
            <Button type="submit" form="category-form" loading={saveMutation.isPending}>{t("categories.save")}</Button>
          </>
        }
      >
        <form
          id="category-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <Input label={t("categories.nameRu")} value={values.names.ru} onChange={(event) => updateName("ru", event.target.value)} required />
          <Input label={t("categories.nameUz")} value={values.names.uz} onChange={(event) => updateName("uz", event.target.value)} required />
          <Input label={t("categories.nameEn")} value={values.names.en} onChange={(event) => updateName("en", event.target.value)} required />
          <Select
            label={t("categories.parent")}
            value={values.parentId}
            options={parentOptions}
            onChange={(parentId) => setValues((current) => ({ ...current, parentId }))}
          />
          <Input label={t("categories.sortOrder")} type="number" min={0} max={10000} step={1} value={values.sortOrder} onChange={(event) => setValues((current) => ({ ...current, sortOrder: event.target.value }))} />
          <Input label="Фото категории (URL)" type="url" value={values.imageUrl} onChange={(event) => setValues((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://..." />
        </form>
      </Modal>
    </Layout>
  );
}
