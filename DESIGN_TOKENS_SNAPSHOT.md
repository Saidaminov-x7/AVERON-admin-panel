# Design tokens snapshot — 2026-11-10

Исходные значения до изменений контраста. Снято с `src/index.css` и компонентов до любых правок.

## CSS цветовые, радиусные и теневые переменные

| Переменная | Light (:root) |
|---|---|
| `--shadow-card` | `0 1px 2px rgb(17 17 17 / .035), 0 6px 18px rgb(17 17 17 / .035)` |
| `--color-bg` | `#ffffff` |
| `--color-surface` | `#ffffff` |
| `--color-surface-soft` | `#f5f5f5` |
| `--color-image-surface` | `#f3f3f3` |
| `--color-border` | `#dddddd` |
| `--color-border-hover` | `#999999` |
| `--color-text` | `#111111` |
| `--color-text-muted` | `#767676` |
| `--color-text-secondary` | `#4a4a4a` |
| `--color-muted` | `#767676` |
| `--color-sidebar-bg` | `#ffffff` |
| `--color-sidebar-border` | `#dddddd` |
| `--color-primary` | `#1a1a1a` |
| `--color-secondary` | `#404040` |
| `--color-button-hover` | `#111111` |
| `--color-primary-hover` | `var(--color-button-hover)` |
| `--color-action-bg` | `#1a1a1a` |
| `--color-on-action` | `#ffffff` |
| `--color-sale` | `#d6001c` |
| `--color-on-primary` | `#ffffff` |
| `--color-overlay` | `rgb(0 0 0 / .58)` |
| `--color-success` | `#24734b` |
| `--color-warning` | `#9a6417` |
| `--color-error` | `#b42318` |
| `--color-info` | `#436d91` |
| `--radius-card` | `0` |
| `--radius-control` | `0` |
| `--radius-xs` | `0` |
| `--radius-sm` | `0.0625rem` |
| `--radius-md` | `0.125rem` |
| `--radius-lg` | `0.1875rem` |
| `--shadow-drawer` | `-18px 0 48px rgb(0 0 0 / .38)` |
| `--color-bg` | `#111315` |
| `--color-surface` | `#181b1f` |
| `--color-surface-soft` | `#20242a` |
| `--color-image-surface` | `#20242a` |
| `--color-border` | `#3a3a3a` |
| `--color-border-hover` | `#737373` |
| `--color-text` | `#f2f3f3` |
| `--color-text-muted` | `#a3a3a3` |
| `--color-text-secondary` | `#c3c7cb` |
| `--color-muted` | `#a3a3a3` |
| `--color-sidebar-bg` | `#181b1f` |
| `--color-sidebar-border` | `#3a3a3a` |
| `--color-primary` | `#f1f1f1` |
| `--color-secondary` | `#cfcfcf` |
| `--color-button-hover` | `#d5d8dd` |
| `--color-primary-hover` | `var(--color-button-hover)` |
| `--color-action-bg` | `#e7e8ea` |
| `--color-on-action` | `#17191c` |
| `--color-sale` | `#ff6577` |
| `--color-on-primary` | `#181818` |
| `--color-overlay` | `rgb(0 0 0 / .58)` |
| `--shadow-card` | `0 1px 2px rgb(0 0 0 / .28), 0 8px 22px rgb(0 0 0 / .16)` |
| `--color-success` | `#78bd94` |
| `--color-warning` | `#e1b966` |
| `--color-error` | `#ff8d83` |
| `--color-info` | `#93b9d7` |
| `--shadow-drawer` | `-18px 0 48px rgb(0 0 0 / .38)` |

Dark theme overrides: `.dark` overrides listed below; inherited values остаются как указано выше.

- `--color-bg:          #111315;`
- `--color-surface:     #181b1f;`
- `--color-surface-soft: #20242a;`
- `--color-image-surface: #20242a;`
- `--color-border:      #3a3a3a;`
- `--color-border-hover: #737373;`
- `--color-text:        #f2f3f3;`
- `--color-text-muted:  #a3a3a3;`
- `--color-text-secondary: #c3c7cb;`
- `--color-muted:       #a3a3a3;`
- `--color-sidebar-bg:  #181b1f;`
- `--color-sidebar-border: #3a3a3a;`
- `--color-primary:     #f1f1f1;`
- `--color-secondary:   #cfcfcf;`
- `--color-button-hover: #d5d8dd;`
- `--color-primary-hover: var(--color-button-hover);`
- `--color-action-bg:   #e7e8ea;`
- `--color-on-action:   #17191c;`
- `--color-sale:        #ff6577;`
- `--color-on-primary:  #181818;`
- `--color-overlay:     rgb(0 0 0 / .58);`
- `--shadow-card: 0 1px 2px rgb(0 0 0 / .28), 0 8px 22px rgb(0 0 0 / .16);`
- `--color-success:     #78bd94;`
- `--color-warning:     #e1b966;`
- `--color-error:       #ff8d83;`
- `--color-info:        #93b9d7;`
- `--shadow-drawer:     -18px 0 48px rgb(0 0 0 / .38);`

## Component values (before changes)

### Button (`src/components/ui/Button.tsx`)
- Variants: primary/default action bg + on-action text; ghost transparent + secondary text; danger error bg + white text; outline surface bg + app text; link app text.
- Hover: primary button-hover; ghost/outline surface-soft; danger brightness(90%); link underline. Focus: ring 2px primary-500, offset 2px. Disabled opacity 0.5.
- Sizes: sm/md/default/lg/icon all height 44px; paddings 12/16/32px; base 13px medium; radius `--radius-control`; border transparent except ghost/outline.

### Container (`src/components/ui/Container.tsx`)
- Default max-width 1440px; horizontal padding `px-4 sm:px-6 lg:px-8` (disabled by `padded={false}`).

### Input, Select, Badge, Card, Modal
- Input uses field styles: surface/text/border, field labels/errors/helpers; native/admin shell input minimum height 44px, visible focus outline, muted placeholder.
- Select/textarea follow admin shell global form rules; detailed local component styles may override.
- Badge variants success/warning/danger/info/neutral use Tailwind light/dark utility pairs.
- Card `.card`/`.card-sm`: surface background, border token, `--radius-lg`/`--radius-md`, `--shadow-card`.
- Modal: surface background, app border, app text, overlay black/60; close button ghost 44x44; footer and header use surface/border tokens.

Snapshot records original global declarations; individual utility classes can override component defaults.
