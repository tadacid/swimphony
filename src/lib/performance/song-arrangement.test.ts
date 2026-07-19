import { describe, expect, it } from "vitest";

import {
  arrangementAtBeat,
  clampBpm,
  MAX_BPM,
  MIN_BPM,
} from "@/lib/performance/song-arrangement";

describe("song arrangement", () => {
  it("moves through a 16-bar song form", () => {
    expect(arrangementAtBeat(0).section).toBe("intro");
    expect(arrangementAtBeat(16).section).toBe("groove");
    expect(arrangementAtBeat(32).section).toBe("lift");
    expect(arrangementAtBeat(48).section).toBe("climax");
    expect(arrangementAtBeat(64).section).toBe("intro");
  });

  it("creates a short breath before the form repeats", () => {
    expect(arrangementAtBeat(63.25).play).toBe(false);
  });

  it("keeps user tempo inside the supported range", () => {
    expect(clampBpm(20)).toBe(MIN_BPM);
    expect(clampBpm(174.4)).toBe(174);
    expect(clampBpm(240)).toBe(MAX_BPM);
  });
});
