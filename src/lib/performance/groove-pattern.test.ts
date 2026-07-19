import { describe, expect, it } from "vitest";

import { grooveAtStep } from "@/lib/performance/groove-pattern";

describe("genre groove patterns", () => {
  it("leaves the original fish-only mode untouched", () => {
    expect(grooveAtStep("original", 0)).toEqual({
      kick: false,
      bass: false,
      hat: false,
      bassOffset: 0,
      bassGateBeats: 0.25,
      velocityScale: 0,
    });
  });

  it("keeps techno and house on a four-on-the-floor pulse", () => {
    for (const mode of ["techno", "house"] as const) {
      expect([0, 4, 8, 12].map((step) => grooveAtStep(mode, step).kick))
        .toEqual([true, true, true, true]);
    }
  });

  it("gives psytrance a rolling bass between kick beats", () => {
    expect(grooveAtStep("psytrance", 0).kick).toBe(true);
    expect(grooveAtStep("psytrance", 1).bass).toBe(true);
    expect(grooveAtStep("psytrance", 2).bass).toBe(true);
    expect(grooveAtStep("psytrance", 3).bass).toBe(true);
  });

  it("keeps gagaku spacious without a dance kick", () => {
    expect(grooveAtStep("gagaku", 0).kick).toBe(false);
    expect(grooveAtStep("gagaku", 0).bass).toBe(true);
    expect(grooveAtStep("gagaku", 1).bass).toBe(false);
  });
});
