import type { ProductLocale } from '../../lib/commerceApi';

const languageNames: Record<ProductLocale, string> = {
  ru: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',
  uz: 'O\u02bbzbekcha',
  en: 'English',
};

export function LanguageFlag({ locale, className = '' }: { locale: ProductLocale; className?: string }) {
  return (
    <img
      src={`/flags/${locale}.svg`}
      alt={languageNames[locale]}
      width="30"
      height="20"
      className={`aspect-[3/2] h-4 w-6 shrink-0 rounded-sm border border-black/10 object-cover shadow-sm dark:border-white/20 ${className}`}
    />
  );
}
