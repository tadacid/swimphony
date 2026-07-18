import { describe, expect, it } from "vitest";

import { hslToHueXy, safeHueFrame } from "@/lib/lighting/hue-color";

describe("Hue color safety", () => {
  it("returns slowly to a dim neutral state when the fish is lost", () => {
    expect(
      safeHueFrame(
        { hue: 220, saturation: 90, brightness: 60, transitionMs: 1200 },
        0.1,
      ),
    ).toEqual({ hue: 40, saturation: 12, brightness: 12, transitionMs: 5000 });
  });

  it("limits medium-confidence and normal output", () => {
    const medium = safeHueFrame(
      { hue: 190, saturation: 90, brightness: 55, transitionMs: 1600 },
      0.5,
    );
    expect(medium.saturation).toBeGreaterThanOrEqual(42);
    expect(medium.saturation).toBeLessThanOrEqual(65);
    expect(medium.brightness).toBeGreaterThanOrEqual(50);
    expect(medium.brightness).toBeLessThanOrEqual(75);
    expect(medium.transitionMs).toBeGreaterThanOrEqual(2400);

    const high = safeHueFrame(
      { hue: 190, saturation: 90, brightness: 100, transitionMs: 1600 },
      0.9,
    );
    expect(high.saturation).toBeLessThanOrEqual(90);
    expect(high.brightness).toBe(100);
    expect(high.transitionMs).toBeGreaterThanOrEqual(1500);
  });

  it("converts HSL colors to finite Hue xy coordinates", () => {
    for (const hue of [0, 60, 120, 180, 240, 300]) {
      const xy = hslToHueXy(hue, 70, 35);
      expect(xy.x).toBeGreaterThanOrEqual(0);
      expect(xy.x).toBeLessThanOrEqual(1);
      expect(xy.y).toBeGreaterThanOrEqual(0);
      expect(xy.y).toBeLessThanOrEqual(1);
    }
  });
});
