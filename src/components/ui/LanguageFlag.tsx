import type { ProductLocale } from '../../lib/commerceApi';

const languageNames: Record<ProductLocale, string> = {
  ru: 'Русский',
  uz: 'Oʻzbekcha',
  en: 'English',
};

export function LanguageFlag({ locale, className = '' }: { locale: ProductLocale; className?: string }) {
  return (
    <span
      role="img"
      aria-label={languageNames[locale]}
      className={`inline-flex h-5 min-w-[30px] shrink-0 items-center justify-center border border-current px-1 text-[10px] font-bold leading-none tracking-wide text-current ${className}`}
    >
      {locale.toUpperCase()}
    </span>
  );
}
