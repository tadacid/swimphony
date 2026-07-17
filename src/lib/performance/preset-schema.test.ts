import { describe, expect, it } from "vitest";

import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import { PerformancePresetSchema } from "@/lib/performance/preset-schema";

describe("PerformancePresetSchema", () => {
  it("accepts the safe built-in preset", () => {
    expect(PerformancePresetSchema.safeParse(DEFAULT_PRESET).success).toBe(true);
  });

  it("rejects brightness above the aquarium safety limit", () => {
    const candidate = {
      ...DEFAULT_PRESET,
      light: { ...DEFAULT_PRESET.light, brightnessRange: [18, 61] },
    };
    expect(PerformancePresetSchema.safeParse(candidate).success).toBe(false);
  });

  it("rejects a light transition below the no-flash minimum", () => {
    const candidate = {
      ...DEFAULT_PRESET,
      light: { ...DEFAULT_PRESET.light, transitionMs: 800 },
    };
    expect(PerformancePresetSchema.safeParse(candidate).success).toBe(false);
  });

  it("rejects unsupported oscillator and mapping values", () => {
    const candidate = {
      ...DEFAULT_PRESET,
      mapping: { ...DEFAULT_PRESET.mapping, speed: "random_glitch" },
      synth: { ...DEFAULT_PRESET.synth, oscillator: "noise" },
    };
    expect(PerformancePresetSchema.safeParse(candidate).success).toBe(false);
  });
});
