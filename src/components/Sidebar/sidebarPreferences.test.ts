import { describe, expect, it } from "vitest";
import { getSidebarWidthPreference } from "./sidebarPreferences";

describe("getSidebarWidthPreference", () => {
  it("uses the design default when no preference exists", () => {
    expect(getSidebarWidthPreference(null)).toBe(256);
  });

  it("uses the design default for blank or invalid stored values", () => {
    expect(getSidebarWidthPreference("")).toBe(256);
    expect(getSidebarWidthPreference("   ")).toBe(256);
    expect(getSidebarWidthPreference("not-a-number")).toBe(256);
  });

  it("clamps persisted widths to the supported range", () => {
    expect(getSidebarWidthPreference("180")).toBe(232);
    expect(getSidebarWidthPreference("288")).toBe(288);
    expect(getSidebarWidthPreference("400")).toBe(320);
  });
});
