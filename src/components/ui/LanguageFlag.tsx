import type { ProductLocale } from '../../lib/commerceApi';

const flags: Record<ProductLocale, { src: string; label: string }> = {
  ru: { src: '/flags/ru.svg', label: 'Русский' },
  uz: { src: '/flags/uz.svg', label: 'Oʻzbekcha' },
  en: { src: '/flags/us.svg', label: 'English' },
};

export function LanguageFlag({ locale, className = '' }: { locale: ProductLocale; className?: string }) {
  const flag = flags[locale];
  return <img src={flag.src} alt={flag.label} width={30} height={20} className={className} />;
}
