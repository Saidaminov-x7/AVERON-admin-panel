import type { ProductLocale } from '../../lib/commerceApi';

const languageNames: Record<ProductLocale, string> = {
  ru: 'Русский',
  uz: 'O‘zbekcha',
  en: 'English',
};

export function LanguageFlag({ locale, className = '' }: { locale: ProductLocale; className?: string }) {
  return (
    <svg
      role="img"
      aria-label={languageNames[locale]}
      className={className}
      viewBox="0 0 30 20"
      width="30"
      height="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      {locale === 'ru' && (
        <>
          <path fill="#fff" d="M1 1h28v6H1z" />
          <path fill="#2455a4" d="M1 7h28v6H1z" />
          <path fill="#d52b1e" d="M1 13h28v6H1z" />
        </>
      )}
      {locale === 'uz' && (
        <>
          <path fill="#1eb7d5" d="M1 1h28v5H1z" />
          <path fill="#fff" d="M1 6h28v1H1z" />
          <path fill="#ce1126" d="M1 7h28v1H1z" />
          <path fill="#fff" d="M1 8h28v5H1z" />
          <path fill="#ce1126" d="M1 13h28v1H1z" />
          <path fill="#1eb7d5" d="M1 14h28v5H1z" />
          <circle cx="7" cy="4" r="1.7" fill="white" />
          <circle cx="7.6" cy="3.6" r="1.35" fill="#1eb7d5" />
          <path fill="white" d="m11 2 .45 1.1 1.2-.08-.88.83.3 1.16-1.02-.65-1.01.65.3-1.16-.9-.83 1.22.08z" />
        </>
      )}
      {locale === 'en' && (
        <>
          <path fill="#fff" d="M1 1h28v18H1z" />
          <path fill="#b22234" d="M1 1h28v2H1zm0 4h28v2H1zm0 4h28v2H1zm0 4h28v2H1zm0 4h28v2H1z" />
          <path fill="#3c3b6e" d="M1 1h12v10H1z" />
          <path fill="white" d="m4 3 .35.8.85.06-.65.53.22.83-.77-.46-.73.46.18-.83-.65-.53.85-.06zm4 0 .35.8.85.06-.65.53.22.83L8 4.76l-.73.46.18-.83-.65-.53.85-.06zm-2 3 .35.8.85.06-.65.53.22.83L6 7.76l-.73.46.18-.83-.65-.53.85-.06zm4 0 .35.8.85.06-.65.53.22.83L10 7.76l-.73.46.18-.83-.65-.53.85-.06z" />
        </>
      )}
      <rect x=".5" y=".5" width="29" height="19" rx="2.5" fill="none" stroke="currentColor" strokeOpacity=".18" />
    </svg>
  );
}
