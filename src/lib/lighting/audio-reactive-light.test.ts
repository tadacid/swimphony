import { describe, expect, it } from "vitest";

import { audioReactiveLight } from "@/lib/lighting/audio-reactive-light";
import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import type { PerformanceFrame } from "@/lib/performance/mapper";

function frame(note: string | null): PerformanceFrame {
  return {
    note,
    pan: 0,
    velocity: 0.45,
    filterHz: 1800,
    noteIntervalMs: 400,
    accent: false,
    light: { hue: 210, saturation: 35, brightness: 24, transitionMs: 2200 },
  };
}

describe("audio-reactive light", () => {
  it("maps different notes to visibly different colors", () => {
    const first = audioReactiveLight(frame("C4"), DEFAULT_PRESET, 0);
    const second = audioReactiveLight(frame("G4"), DEFAULT_PRESET, 0);
    const distance = Math.abs(first.hue - second.hue);
    expect(Math.min(distance, 360 - distance)).toBeGreaterThan(70);
  });

  it("changes color direction with synth timbre", () => {
    const sine = audioReactiveLight(frame("C4"), DEFAULT_PRESET, 0);
    const square = audioReactiveLight(
      frame("C4"),
      {
        ...DEFAULT_PRESET,
        synth: { ...DEFAULT_PRESET.synth, oscillator: "square" },
      },
      0,
    );
    expect(sine.hue).not.toBe(square.hue);
  });

  it("keeps the submission effect bright, smooth, and bounded", () => {
    const light = audioReactiveLight(
      { ...frame("A4"), velocity: 1, accent: true },
      DEFAULT_PRESET,
      500,
    );
    expect(light.saturation).toBeLessThanOrEqual(90);
    expect(light.brightness).toBe(100);
    expect(light.transitionMs).toBeGreaterThanOrEqual(1500);
  });

  it("keeps the neutral light when no note is playing", () => {
    expect(audioReactiveLight(frame(null), DEFAULT_PRESET, 0)).toEqual(frame(null).light);
  });
});
