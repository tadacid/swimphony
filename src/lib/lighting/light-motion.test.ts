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
    expect(next.brightness).toBe(100);
    expect(next.transitionMs).toBe(120);
  });

  it("uses separated beat colors without brightness flashing", () => {
    const first = applyLightMotion(LIGHT, "beat-palette", 0, 160);
    const next = applyLightMotion(LIGHT, "beat-palette", 400, 160);

    expect(next.hue).not.toBe(first.hue);
    expect(next.brightness).toBe(first.brightness);
    expect(next.brightness).toBe(100);
    expect(next.saturation).toBeGreaterThanOrEqual(80);
    expect(next.transitionMs).toBe(0);
  });

  it("creates deterministic party steps at safe non-zero brightness", () => {
    const frames = Array.from({ length: 12 }, (_, step) =>
      applyLightMotion(LIGHT, "party-edge", step * 500, 120));

    expect(new Set(frames.map((frame) => frame.hue)).size).toBeGreaterThan(3);
    expect(new Set(frames.map((frame) => frame.brightness))).toEqual(new Set([65, 100]));
    expect(frames.every((frame) => frame.transitionMs === 0)).toBe(true);
  });

  it("alternates strobe brightness every half beat", () => {
    const frames = [0, 250, 500, 750].map((elapsedMs) =>
      applyLightMotion(LIGHT, "strobe", elapsedMs, 120));

    expect(frames.map((frame) => frame.brightness)).toEqual([100, 0, 100, 0]);
    expect(frames.every((frame) => frame.transitionMs === 0)).toBe(true);
  });
});
