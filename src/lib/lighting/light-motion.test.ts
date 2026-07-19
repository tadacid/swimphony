import { describe, expect, it } from "vitest";

import { applyLightMotion } from "@/lib/lighting/light-motion";
import type { LightFrame } from "@/lib/performance/mapper";

const LIGHT: LightFrame = {
  hue: 214,
  saturation: 68,
  brightness: 86,
  transitionMs: 1700,
};

describe("light motion presets", () => {
  it("preserves the existing smooth flow exactly", () => {
    expect(applyLightMotion(LIGHT, "flow", 2000, 120)).toBe(LIGHT);
  });

  it("holds a stepped color until the next safe interval", () => {
    const first = applyLightMotion(LIGHT, "color-steps", 100, 120);
    const held = applyLightMotion(LIGHT, "color-steps", 900, 120);
    const next = applyLightMotion(LIGHT, "color-steps", 1100, 120);

    expect(held.hue).toBe(first.hue);
    expect(next.hue).not.toBe(first.hue);
    expect(next.brightness).toBe(82);
    expect(next.transitionMs).toBe(220);
  });

  it("uses separated beat colors without brightness flashing", () => {
    const first = applyLightMotion(LIGHT, "beat-palette", 0, 160);
    const next = applyLightMotion(LIGHT, "beat-palette", 400, 160);

    expect(next.hue).not.toBe(first.hue);
    expect(next.brightness).toBe(first.brightness);
    expect(next.brightness).toBe(82);
    expect(next.saturation).toBeGreaterThanOrEqual(80);
    expect(next.transitionMs).toBe(80);
  });
});
