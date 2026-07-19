export const MIN_BPM = 40;
export const MAX_BPM = 180;
export const SONG_LENGTH_BEATS = 64;

export type SongSection = "intro" | "groove" | "lift" | "climax";

export type ArrangedStep = {
  section: SongSection;
  bar: number;
  play: boolean;
  velocityScale: number;
  harmonicOffset: number;
  bassEnabled: boolean;
  forceAccent: boolean;
};

const PROGRESSION = [0, 5, 3, 7] as const;

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 120;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

export function arrangementAtBeat(absoluteBeat: number): ArrangedStep {
  const beat = ((absoluteBeat % SONG_LENGTH_BEATS) + SONG_LENGTH_BEATS) % SONG_LENGTH_BEATS;
  const bar = Math.floor(beat / 4);
  const beatInBar = beat % 4;
  const harmonicOffset = PROGRESSION[bar % PROGRESSION.length];

  if (bar < 4) {
    return {
      section: "intro",
      bar,
      play: Math.abs(beatInBar - Math.round(beatInBar)) < 0.05,
      velocityScale: 0.62,
      harmonicOffset,
      bassEnabled: bar >= 2,
      forceAccent: beatInBar < 0.05,
    };
  }

  if (bar < 8) {
    return {
      section: "groove",
      bar,
      play: true,
      velocityScale: 0.82,
      harmonicOffset,
      bassEnabled: true,
      forceAccent: beatInBar < 0.05,
    };
  }

  if (bar < 12) {
    return {
      section: "lift",
      bar,
      play: true,
      velocityScale: 0.9,
      harmonicOffset: harmonicOffset + (bar === 11 ? 12 : 0),
      bassEnabled: bar !== 11,
      forceAccent: beatInBar < 0.05 || beatInBar >= 3.5,
    };
  }

  return {
    section: "climax",
    bar,
    play: !(bar === 15 && beatInBar >= 3),
    velocityScale: 1,
    harmonicOffset,
    bassEnabled: true,
    forceAccent: beatInBar < 0.05 || (bar === 15 && beatInBar >= 2.5),
  };
}
