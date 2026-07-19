import type { SoundMode } from "@/lib/performance/mode-presets";

export type GrooveStep = {
  kick: boolean;
  bass: boolean;
  hat: boolean;
  bassOffset: number;
  bassGateBeats: number;
  velocityScale: number;
};

type GroovePattern = {
  kicks: readonly number[];
  basses: readonly number[];
  hats: readonly number[];
  bassOffsets: readonly number[];
  bassGateBeats: number;
  velocityScale: number;
};

const EMPTY_PATTERN: GroovePattern = {
  kicks: [],
  basses: [],
  hats: [],
  bassOffsets: [0],
  bassGateBeats: 0.25,
  velocityScale: 0,
};

const GROOVE_PATTERNS: Record<SoundMode, GroovePattern> = {
  original: EMPTY_PATTERN,
  techno: {
    kicks: [0, 4, 8, 12],
    basses: [0, 3, 6, 8, 11, 14],
    hats: [2, 6, 10, 14],
    bassOffsets: [0, 0, 7, 0, 3, 0],
    bassGateBeats: 0.22,
    velocityScale: 0.82,
  },
  house: {
    kicks: [0, 4, 8, 12],
    basses: [2, 6, 10, 14],
    hats: [2, 6, 10, 14],
    bassOffsets: [0, 7, 4, 9],
    bassGateBeats: 0.38,
    velocityScale: 0.72,
  },
  psytrance: {
    kicks: [0, 4, 8, 12],
    basses: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15],
    hats: [2, 6, 10, 14],
    bassOffsets: [0, 12, 7, 12],
    bassGateBeats: 0.18,
    velocityScale: 0.82,
  },
  acid: {
    kicks: [0, 4, 8, 12],
    basses: [0, 2, 3, 5, 7, 8, 10, 11, 13, 15],
    hats: [2, 6, 10, 14],
    bassOffsets: [0, 12, 3, 7, 10, 7, 3, 12],
    bassGateBeats: 0.2,
    velocityScale: 0.8,
  },
  dub: {
    kicks: [0, 10],
    basses: [0, 7, 12],
    hats: [4, 12],
    bassOffsets: [0, -12, 7],
    bassGateBeats: 0.72,
    velocityScale: 0.68,
  },
  "drum-and-bass": {
    kicks: [0, 7, 10],
    basses: [0, 3, 7, 10, 14],
    hats: [0, 2, 4, 6, 8, 10, 12, 14],
    bassOffsets: [0, 0, 12, 7, 3],
    bassGateBeats: 0.18,
    velocityScale: 0.8,
  },
  glitch: {
    kicks: [0, 5, 11],
    basses: [0, 3, 6, 7, 11, 15],
    hats: [1, 4, 6, 9, 13, 15],
    bassOffsets: [0, 12, -5, 7, 3, 19],
    bassGateBeats: 0.12,
    velocityScale: 0.62,
  },
  gagaku: {
    kicks: [],
    basses: [0],
    hats: [],
    bassOffsets: [0, 7, 12, 5],
    bassGateBeats: 3.5,
    velocityScale: 0.5,
  },
};

export function grooveAtStep(mode: SoundMode, absoluteStep: number): GrooveStep {
  const pattern = GROOVE_PATTERNS[mode];
  const step = ((Math.floor(absoluteStep) % 16) + 16) % 16;
  const bassIndex = pattern.basses.indexOf(step);

  return {
    kick: pattern.kicks.includes(step),
    bass: bassIndex >= 0,
    hat: pattern.hats.includes(step),
    bassOffset: bassIndex >= 0
      ? pattern.bassOffsets[bassIndex % pattern.bassOffsets.length] ?? 0
      : 0,
    bassGateBeats: pattern.bassGateBeats,
    velocityScale: pattern.velocityScale,
  };
}
