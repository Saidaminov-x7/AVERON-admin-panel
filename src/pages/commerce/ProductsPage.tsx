import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import { createManualProduct, getProducts } from "../../lib/commerceApi";
const words = {
  ru: {
    page: "Товары",
    catalog: "Каталог AVERON",
    add: "Опубликовать товар",
    title: "Название",
    uz: "Название на узбекском",
    en: "Название на английском",
    desc: "Описание",
    source: "Ссылка на товар в Китае",
    image: "Ссылка на изображение",
    cost: "Цена в юанях",
    rate: "Курс CNY → UZS",
    price: "Цена продажи, сум",
    color: "Цвет",
    size: "Размер",
    publish: "Сразу опубликовать на сайте и в Telegram",
    save: "Создать товар",
    cancel: "Отмена",
    loading: "Загрузка…",
    empty: "Опубликованных товаров пока нет",
    done: "Товар создан",
  },
  uz: {
    page: "Mahsulotlar",
    catalog: "AVERON katalogi",
    add: "Mahsulot e’lon qilish",
    title: "Nomi",
    uz: "O‘zbekcha nomi",
    en: "Inglizcha nomi",
    desc: "Tavsif",
    source: "Xitoydagi mahsulot havolasi",
    image: "Rasm havolasi",
    cost: "Yuan narxi",
    rate: "CNY → UZS kursi",
    price: "Sotuv narxi, so‘m",
    color: "Rang",
    size: "O‘lcham",
    publish: "Sayt va Telegramda darhol e’lon qilish",
    save: "Mahsulot yaratish",
    cancel: "Bekor qilish",
    loading: "Yuklanmoqda…",
    empty: "Hozircha mahsulot yo‘q",
    done: "Mahsulot yaratildi",
  },
  en: {
    page: "Products",
    catalog: "AVERON catalog",
    add: "Publish product",
    title: "Title",
    uz: "Uzbek title",
    en: "English title",
    desc: "Description",
    source: "China product URL",
    image: "Image URL",
    cost: "Price in CNY",
    rate: "CNY → UZS rate",
    price: "Sale price, UZS",
    color: "Color",
    size: "Size",
    publish: "Publish immediately on the site and Telegram",
    save: "Create product",
    cancel: "Cancel",
    loading: "Loading…",
    empty: "No published products yet",
    done: "Product created",
  },
} as const;
export default function ProductsPage() {
  const { i18n } = useTranslation();
  const t = words[i18n.language?.slice(0, 2) as keyof typeof words] ?? words.ru;
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["commerce-products"],
    queryFn: getProducts,
  });
  const mutation = useMutation({
    mutationFn: createManualProduct,
    onSuccess: () => {
      toast.success(t.done);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["commerce-products"] });
    },
    onError: () => toast.error("Не удалось создать товар"),
  });
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    mutation.mutate({
      title: String(f.get("title")),
      titleUz: String(f.get("titleUz") || ""),
      titleEn: String(f.get("titleEn") || ""),
      description: String(f.get("description") || ""),
      sourceUrl: String(f.get("sourceUrl")),
      imageUrl: String(f.get("imageUrl") || "") || undefined,
      sourcePriceCny: Number(f.get("sourcePriceCny")),
      exchangeRate: Number(f.get("exchangeRate")),
      salePriceUzs: Number(f.get("salePriceUzs")),
      color: String(f.get("color") || ""),
      size: String(f.get("size") || ""),
      publish: f.get("publish") === "on",
    });
  };
  const products = data?.items ?? [];
  const field = "input";
  return (
    <Layout title={t.page}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-widest text-violet-500">
            CATALOG
          </p>
          <h1 className="text-2xl font-black">{t.catalog}</h1>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Plus size={18} />
          {t.add}
        </button>
      </div>
      {open && (
        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t.add}</h2>
            <button onClick={() => setOpen(false)}>
              <X />
            </button>
          </div>
          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label>
              {t.title}
              <input required name="title" className={field} />
            </label>
            <label>
              {t.uz}
              <input name="titleUz" className={field} />
            </label>
            <label>
              {t.en}
              <input name="titleEn" className={field} />
            </label>
            <label>
              {t.source}
              <input required type="url" name="sourceUrl" className={field} />
            </label>
            <label>
              {t.image}
              <input type="url" name="imageUrl" className={field} />
            </label>
            <label>
              {t.cost}
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
              {t.rate}
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
              {t.price}
              <input
                required
                min="1"
                type="number"
                name="salePriceUzs"
                className={field}
              />
            </label>
            <label>
              {t.color}
              <input name="color" className={field} />
            </label>
            <label>
              {t.size}
              <input name="size" className={field} />
            </label>
            <label className="md:col-span-2">
              {t.desc}
              <textarea name="description" className={`${field} min-h-24`} />
            </label>
            <label className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" name="publish" defaultChecked />
              {t.publish}
            </label>
            <div className="flex gap-3 md:col-span-2">
              <button disabled={mutation.isPending} className="btn-primary">
                {t.save}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-ghost"
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}
      {isLoading ? (
        <div className="card">{t.loading}</div>
      ) : products.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p: any) => (
            <article className="card overflow-hidden p-0" key={p.id}>
              <div className="aspect-[4/3] bg-stone-100 dark:bg-stone-800">
                {p.images?.[0]?.url && (
                  <img
                    src={p.images[0].url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="p-4">
                <h2 className="font-bold">
                  {p.translations?.ru?.title || p.slug}
                </h2>
                <div className="mt-3 flex justify-between">
                  <strong>{Number(p.salePriceUzs).toLocaleString()} UZS</strong>
                  <span className="badge-success">PUBLISHED</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="card text-muted">{t.empty}</div>
      )}
    </Layout>
  );
}
