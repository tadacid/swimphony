import { describe, expect, it } from "vitest";

import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import { MODE_OPTIONS, MODE_PRESETS } from "@/lib/performance/mode-presets";
import { PerformancePresetSchema } from "@/lib/performance/preset-schema";

describe("mode presets", () => {
  it("keeps the existing sound as Original", () => {
    expect(MODE_PRESETS.original.preset).toBe(DEFAULT_PRESET);
  });

  it("provides nine safe and distinct performance modes", () => {
    expect(MODE_OPTIONS).toHaveLength(9);
    expect(new Set(MODE_OPTIONS.map((option) => option.preset.name)).size).toBe(9);
    for (const option of MODE_OPTIONS) {
      expect(PerformancePresetSchema.safeParse(option.preset).success).toBe(true);
      expect(option.rhythm.sequence.length).toBeGreaterThan(0);
    }
  });

  it("makes dance modes faster than dub and gagaku", () => {
    expect(MODE_PRESETS.techno.preset.bpm).toBeGreaterThan(MODE_PRESETS.dub.preset.bpm);
    expect(MODE_PRESETS.psytrance.preset.bpm).toBeGreaterThan(MODE_PRESETS.gagaku.preset.bpm);
  });
});
