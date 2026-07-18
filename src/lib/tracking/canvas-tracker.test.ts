import { describe, expect, it } from "vitest";

import {
  colorSimilarity,
  GOLDFISH_RECOVERY_PROFILE,
} from "@/lib/tracking/canvas-tracker";

describe("goldfish recovery color", () => {
  it("strongly matches an orange fish", () => {
    expect(
      colorSimilarity(
        { h: 42, s: 0.82, v: 0.72 },
        GOLDFISH_RECOVERY_PROFILE,
      ),
    ).toBeGreaterThan(0.8);
  });

  it("rejects green aquarium water", () => {
    expect(
      colorSimilarity(
        { h: 105, s: 0.65, v: 0.55 },
        GOLDFISH_RECOVERY_PROFILE,
      ),
    ).toBeLessThan(0.42);
  });
});
