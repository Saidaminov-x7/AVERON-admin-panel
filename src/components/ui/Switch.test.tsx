import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("keeps a 44px hit target, token-based pill track, and linked label and description", () => {
    const markup = renderToStaticMarkup(createElement(Switch, {
      checked: false,
      onChange: vi.fn(),
      label: "Publish product",
      description: "The product appears after saving.",
      ariaDescribedBy: "publication-status",
    }));
    const labelId = markup.match(/<span id="([^"]+)" class="font-medium text-app block">Publish product/)?.[1];
    const descriptionId = markup.match(/<span id="([^"]+)" class="text-muted block mt-0\.5">The product appears/)?.[1];

    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-checked="false"');
    expect(markup).toContain('h-11 w-11 shrink-0 items-center justify-center rounded-full bg-transparent');
    expect(markup).toContain('focus-visible:ring-2');
    expect(markup).toContain('h-6 w-11 p-1');
    expect(markup).toContain('bg-[var(--color-surface-soft)]');
    expect(labelId).toBeTruthy();
    expect(descriptionId).toBeTruthy();
    expect(markup).toContain(`aria-labelledby="${labelId}"`);
    expect(markup).toContain(`aria-describedby="${descriptionId} publication-status"`);
  });

  it("uses a compact track and reports the checked state and disabled state", () => {
    const markup = renderToStaticMarkup(createElement(Switch, {
      checked: true,
      onChange: vi.fn(),
      ariaLabel: "Maintenance mode",
      size: "sm",
      disabled: true,
    }));

    expect(markup).toContain('aria-label="Maintenance mode"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain("disabled=");
    expect(markup).toContain('h-5 w-9 p-1');
    expect(markup).toContain('bg-[var(--color-primary)]');
    expect(markup).toContain('bg-[var(--color-on-primary)]');
  });
});
