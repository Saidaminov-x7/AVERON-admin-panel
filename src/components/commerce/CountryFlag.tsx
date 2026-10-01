import type { ReactNode } from "react";
import type { ProductCountry } from "../../lib/commerceApi";

const flagPaths: Record<ProductCountry, ReactNode> = {
  CN: (
    <>
      <rect width="20" height="14" fill="#de2910" />
      <path d="m4 2 .7 1.4 1.6.2-1.2 1.1.3 1.6L4 5.5 2.6 6.3l.3-1.6L1.7 3.6l1.6-.2z" fill="#ffde00" />
      <circle cx="7.7" cy="2.3" r=".45" fill="#ffde00" />
      <circle cx="8.4" cy="4" r=".45" fill="#ffde00" />
      <circle cx="7.7" cy="5.8" r=".45" fill="#ffde00" />
      <circle cx="6.1" cy="7" r=".45" fill="#ffde00" />
    </>
  ),
  US: (
    <>
      <rect width="20" height="14" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((y) => <rect key={y} y={y} width="20" height="1" fill="#b22234" />)}
      <rect width="8.5" height="7.5" fill="#3c3b6e" />
      <path d="M1.3 1.2h.6v.6h-.6zm1.8 1.2h.6V3h-.6zm1.8-1.2h.6v.6h-.6zm1.8 1.2h.6V3h-.6zM1.3 3.6h.6v.6h-.6zm1.8 1.2h.6v.6h-.6zm1.8-1.2h.6v.6h-.6zm1.8 1.2h.6v.6h-.6z" fill="#fff" />
    </>
  ),
  TR: (
    <>
      <rect width="20" height="14" fill="#e30a17" />
      <circle cx="8" cy="7" r="4" fill="#fff" />
      <circle cx="9.2" cy="6.2" r="3.2" fill="#e30a17" />
      <path d="m13 4.8.7 1.6 1.7.1-1.3 1.1.4 1.7-1.5-.9-1.4.9.4-1.7-1.3-1.1 1.7-.1z" fill="#fff" />
    </>
  ),
  IT: (
    <>
      <rect width="6.67" height="14" fill="#009246" />
      <rect x="6.67" width="6.66" height="14" fill="#fff" />
      <rect x="13.33" width="6.67" height="14" fill="#ce2b37" />
    </>
  ),
  GB: (
    <>
      <rect width="20" height="14" fill="#012169" />
      <path d="m0 0 20 14M20 0 0 14" stroke="#fff" strokeWidth="3.2" />
      <path d="m0 0 20 14M20 0 0 14" stroke="#c8102e" strokeWidth="1.3" />
      <path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="4.2" />
      <path d="M10 0v14M0 7h20" stroke="#c8102e" strokeWidth="2" />
    </>
  ),
};

export function CountryFlag({ country }: { country: ProductCountry }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 14"
      className="h-4 w-5 shrink-0 overflow-hidden rounded-[2px] shadow-sm"
      focusable="false"
    >
      {flagPaths[country]}
    </svg>
  );
}
