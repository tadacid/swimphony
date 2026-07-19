import { describe, expect, it } from "vitest";

import { isProjectionSignal, type ProjectionSignal } from "@/lib/projection/signal";

const signal: ProjectionSignal = {
  version: 1,
  sentAt: 1,
  fish: {
    x: 0.4,
    y: 0.6,
    speed: 0.3,
    direction: 0,
    acceleration: 0.1,
    confidence: 0.9,
    detected: true,
  },
  light: { hue: 42, saturation: 70, brightness: 80, transitionMs: 1800 },
  note: "A4",
  accent: false,
  bpm: 72,
  modeLabel: "Original",
  visualPreset: "golden-trail",
  audioActive: true,
};

describe("isProjectionSignal", () => {
  it("accepts a valid live projection signal", () => {
    expect(isProjectionSignal(signal)).toBe(true);
  });

  it("rejects incomplete values", () => {
    expect(isProjectionSignal({ version: 1, sentAt: 1 })).toBe(false);
  });
});
