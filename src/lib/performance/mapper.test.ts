import { describe, expect, it } from "vitest";

import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import { mapFishToPerformance } from "@/lib/performance/mapper";
import type { FishState } from "@/lib/tracking/types";

function fish(overrides: Partial<FishState> = {}): FishState {
  return {
    x: 0.5,
    y: 0.5,
    speed: 0.5,
    direction: 0,
    acceleration: 0,
    area: 0.015,
    confidence: 0.9,
    detected: true,
    timestamp: 0,
    source: "sample-telemetry",
    ...overrides,
  };
}

describe("mapFishToPerformance", () => {
  it("maps horizontal position to stereo pan", () => {
    expect(mapFishToPerformance(fish({ x: 0 }), DEFAULT_PRESET).pan).toBe(-1);
    expect(mapFishToPerformance(fish({ x: 1 }), DEFAULT_PRESET).pan).toBe(1);
  });

  it("maps higher fish position to a higher note", () => {
    const top = mapFishToPerformance(fish({ y: 0.1 }), DEFAULT_PRESET);
    const bottom = mapFishToPerformance(fish({ y: 0.9 }), DEFAULT_PRESET);

    expect(top.note).not.toBe(bottom.note);
  });

  it("returns silence and neutral light when tracking is lost", () => {
    const frame = mapFishToPerformance(
      fish({ detected: false, confidence: 0.1 }),
      DEFAULT_PRESET,
    );

    expect(frame.note).toBeNull();
    expect(frame.velocity).toBe(0);
    expect(frame.light.brightness).toBeLessThanOrEqual(12);
  });

  it("enforces brightness and transition safety", () => {
    const frame = mapFishToPerformance(
      fish({ y: 0, speed: 1 }),
      DEFAULT_PRESET,
    );

    expect(frame.light.brightness).toBeLessThanOrEqual(
      DEFAULT_PRESET.safety.maxBrightness,
    );
    expect(frame.light.transitionMs).toBeGreaterThanOrEqual(
      DEFAULT_PRESET.safety.minLightTransitionMs,
    );
  });
});
