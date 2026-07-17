import { describe, expect, it } from "vitest";

import {
  confidenceFromScores,
  ema,
  holdLostFish,
  normalizePointToRoi,
  scoreCandidate,
  shortestAngleDelta,
  updateFishMotion,
  type AquariumRoi,
} from "@/lib/tracking/tracking-math";
import type { FishState } from "@/lib/tracking/types";

const ROI: AquariumRoi = { x: 0.1, y: 0.2, width: 0.8, height: 0.5 };

function fish(overrides: Partial<FishState> = {}): FishState {
  return {
    x: 0.2,
    y: 0.4,
    speed: 0.1,
    direction: 0,
    acceleration: 0,
    area: 0.01,
    confidence: 0.9,
    detected: true,
    timestamp: 1000,
    source: "sample-video",
    ...overrides,
  };
}

describe("tracking math", () => {
  it("normalizes coordinates inside the aquarium ROI", () => {
    expect(normalizePointToRoi({ x: 0.5, y: 0.45 }, ROI)).toEqual({
      x: 0.5,
      y: 0.5,
    });
    expect(normalizePointToRoi({ x: 0, y: 1 }, ROI)).toEqual({ x: 0, y: 1 });
  });

  it("calculates speed and acceleration with irregular timestamps", () => {
    const next = updateFishMotion(
      { x: 0.6, y: 0.4 },
      0.02,
      0.8,
      1275,
      fish(),
    );

    expect(next.speed).toBeGreaterThan(0.1);
    expect(next.acceleration).toBeGreaterThan(0);
    expect(next.timestamp).toBe(1275);
  });

  it("wraps angle differences at the -pi/pi boundary", () => {
    const delta = shortestAngleDelta(Math.PI - 0.1, -Math.PI + 0.1);
    expect(delta).toBeCloseTo(0.2, 5);
  });

  it("smooths values without overshooting", () => {
    expect(ema(0, 1, 0.25)).toBe(0.25);
    expect(ema(1, 0, 0.25)).toBe(0.75);
  });

  it("uses the documented candidate weights", () => {
    expect(
      scoreCandidate({
        colorSimilarity: 1,
        motionScore: 0,
        previousPositionProximity: 0,
        shapeScore: 0,
      }),
    ).toBeCloseTo(0.45);
    expect(
      scoreCandidate({
        colorSimilarity: 1,
        motionScore: 1,
        previousPositionProximity: 1,
        shapeScore: 1,
      }),
    ).toBeCloseTo(1);
  });

  it("reduces confidence when candidates are ambiguous", () => {
    const clear = confidenceFromScores(0.8, 0.2, 0.9);
    const ambiguous = confidenceFromScores(0.8, 0.76, 0.9);
    expect(clear).toBeGreaterThan(ambiguous);
  });

  it("holds position briefly and then marks tracking lost", () => {
    const held = holdLostFish(fish(), 1100, 1);
    const lost = holdLostFish(held, 1500, 5);
    expect(held.x).toBe(0.2);
    expect(held.confidence).toBeLessThan(0.9);
    expect(lost.detected).toBe(false);
  });
});
