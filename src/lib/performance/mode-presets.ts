import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import type { PerformancePreset } from "@/lib/performance/preset-schema";

export type SoundMode =
  | "original"
  | "techno"
  | "house"
  | "psytrance"
  | "acid"
  | "dub"
  | "drum-and-bass"
  | "glitch"
  | "gagaku";

export type RhythmProfile = {
  intervalScale: number;
  minimumBeatFraction: number;
  gateBeats: number;
  sequence: readonly number[];
  accentEvery: number;
  bassEvery: number;
  chordEvery: number;
};

type ModeOption = {
  id: SoundMode;
  label: string;
  cue: string;
  preset: PerformancePreset;
  rhythm: RhythmProfile;
};

const mode = (
  id: SoundMode,
  label: string,
  cue: string,
  preset: PerformancePreset,
  rhythm: RhythmProfile,
): ModeOption => ({ id, label, cue, preset, rhythm });

export const MODE_OPTIONS: readonly ModeOption[] = [
  mode("original", "Original", "Organic flow", DEFAULT_PRESET, {
    intervalScale: 1,
    minimumBeatFraction: 0.5,
    gateBeats: 0.75,
    sequence: [0],
    accentEvery: 0,
    bassEvery: 0,
    chordEvery: 0,
  }),
  mode("techno", "Techno", "Tight machine pulse", {
    ...DEFAULT_PRESET,
    name: "Chrome Current",
    description: "Tight machine pulses driven by speed and sharp turns.",
    root: "D",
    scale: "minor",
    bpm: 134,
    octaveRange: [2, 4],
    mapping: { horizontal: "pan_hue", vertical: "pitch_hue", speed: "density_filter" },
    synth: { oscillator: "square", attack: 0.01, release: 0.16, reverb: 0.14, filterMinHz: 260, filterMaxHz: 7200 },
    light: { hueRange: [185, 315], saturationRange: [68, 100], brightnessRange: [38, 60], transitionMs: 1300 },
    safety: { maxNotesPerSecond: 8, maxGain: 0.52, maxBrightness: 60, minLightTransitionMs: 1200 },
  }, {
    intervalScale: 0.38,
    minimumBeatFraction: 0.25,
    gateBeats: 0.2,
    sequence: [0, 0, 7, 0],
    accentEvery: 4,
    bassEvery: 4,
    chordEvery: 0,
  }),
  mode("house", "House", "Warm four-on-floor", {
    ...DEFAULT_PRESET,
    name: "Velvet House",
    description: "Warm four-on-the-floor movement with melodic chord lifts.",
    root: "C",
    scale: "dorian",
    bpm: 124,
    octaveRange: [3, 5],
    mapping: { horizontal: "pan_brightness", vertical: "pitch_hue", speed: "density_saturation" },
    synth: { oscillator: "triangle", attack: 0.025, release: 0.48, reverb: 0.3, filterMinHz: 380, filterMaxHz: 6800 },
    light: { hueRange: [18, 328], saturationRange: [58, 92], brightnessRange: [34, 60], transitionMs: 1600 },
    safety: { maxNotesPerSecond: 5.5, maxGain: 0.54, maxBrightness: 60, minLightTransitionMs: 1400 },
  }, {
    intervalScale: 0.62,
    minimumBeatFraction: 0.5,
    gateBeats: 0.62,
    sequence: [0, 4, 7, 9],
    accentEvery: 4,
    bassEvery: 2,
    chordEvery: 4,
  }),
  mode("psytrance", "Psytrance", "Rave propulsion", {
    ...DEFAULT_PRESET,
    name: "Neon Shoal",
    description: "Relentless rave propulsion with octave-leaping psychedelic color.",
    root: "F#",
    scale: "minor",
    bpm: 145,
    octaveRange: [2, 5],
    mapping: { horizontal: "pan_hue", vertical: "pitch_hue", speed: "density_filter" },
    synth: { oscillator: "sawtooth", attack: 0.01, release: 0.14, reverb: 0.28, filterMinHz: 220, filterMaxHz: 10000 },
    light: { hueRange: [275, 115], saturationRange: [76, 100], brightnessRange: [42, 60], transitionMs: 1200 },
    safety: { maxNotesPerSecond: 8, maxGain: 0.5, maxBrightness: 60, minLightTransitionMs: 1200 },
  }, {
    intervalScale: 0.3,
    minimumBeatFraction: 0.25,
    gateBeats: 0.15,
    sequence: [0, 12, 7, 12],
    accentEvery: 4,
    bassEvery: 2,
    chordEvery: 0,
  }),
  mode("acid", "Acid", "Squirming filter line", {
    ...DEFAULT_PRESET,
    name: "Acid Gill",
    description: "A squirming resonant-style bass line that bends with every turn.",
    root: "C#",
    scale: "minor",
    bpm: 128,
    octaveRange: [2, 4],
    mapping: { horizontal: "pan_hue", vertical: "pitch_brightness", speed: "density_filter" },
    synth: { oscillator: "sawtooth", attack: 0.01, release: 0.12, reverb: 0.1, filterMinHz: 120, filterMaxHz: 9000 },
    light: { hueRange: [62, 305], saturationRange: [80, 100], brightnessRange: [40, 60], transitionMs: 1300 },
    safety: { maxNotesPerSecond: 8, maxGain: 0.48, maxBrightness: 60, minLightTransitionMs: 1200 },
  }, {
    intervalScale: 0.35,
    minimumBeatFraction: 0.25,
    gateBeats: 0.18,
    sequence: [0, 12, 3, 7, 10, 7, 3, 12],
    accentEvery: 3,
    bassEvery: 1,
    chordEvery: 0,
  }),
  mode("dub", "Dub", "Deep water echo", {
    ...DEFAULT_PRESET,
    name: "Deep Water Dub",
    description: "Submerged bass, wide empty space, and long underwater echoes.",
    root: "D",
    scale: "minor_pentatonic",
    bpm: 82,
    octaveRange: [2, 4],
    mapping: { horizontal: "pan_hue", vertical: "pitch_brightness", speed: "density_filter" },
    synth: { oscillator: "sine", attack: 0.08, release: 1.8, reverb: 0.72, filterMinHz: 180, filterMaxHz: 3200 },
    light: { hueRange: [175, 235], saturationRange: [48, 86], brightnessRange: [28, 58], transitionMs: 2600 },
    safety: { maxNotesPerSecond: 3, maxGain: 0.6, maxBrightness: 60, minLightTransitionMs: 2000 },
  }, {
    intervalScale: 0.92,
    minimumBeatFraction: 1,
    gateBeats: 1.55,
    sequence: [0, -12, 7, 0],
    accentEvery: 4,
    bassEvery: 2,
    chordEvery: 0,
  }),
  mode("drum-and-bass", "D&B", "Fast broken current", {
    ...DEFAULT_PRESET,
    name: "Breakwater",
    description: "Fast broken currents, clipped bass hits, and sudden octave jumps.",
    root: "E",
    scale: "minor",
    bpm: 174,
    octaveRange: [2, 5],
    mapping: { horizontal: "pan_hue", vertical: "pitch_hue", speed: "density_filter" },
    synth: { oscillator: "square", attack: 0.01, release: 0.1, reverb: 0.16, filterMinHz: 160, filterMaxHz: 8800 },
    light: { hueRange: [198, 28], saturationRange: [68, 100], brightnessRange: [36, 60], transitionMs: 1200 },
    safety: { maxNotesPerSecond: 8, maxGain: 0.5, maxBrightness: 60, minLightTransitionMs: 1200 },
  }, {
    intervalScale: 0.32,
    minimumBeatFraction: 0.25,
    gateBeats: 0.12,
    sequence: [0, 0, 12, 7, 0, 3, 12, -5],
    accentEvery: 3,
    bassEvery: 2,
    chordEvery: 0,
  }),
  mode("glitch", "Glitch", "Angular micro-cuts", {
    ...DEFAULT_PRESET,
    name: "Pixel Fin",
    description: "Angular micro-cuts and unpredictable jumps triggered by tiny gestures.",
    root: "A",
    scale: "minor_pentatonic",
    bpm: 112,
    octaveRange: [3, 6],
    mapping: { horizontal: "pan_hue", vertical: "pitch_hue", speed: "density_saturation" },
    synth: { oscillator: "square", attack: 0.01, release: 0.07, reverb: 0.24, filterMinHz: 600, filterMaxHz: 11000 },
    light: { hueRange: [160, 342], saturationRange: [72, 100], brightnessRange: [40, 60], transitionMs: 1200 },
    safety: { maxNotesPerSecond: 8, maxGain: 0.44, maxBrightness: 60, minLightTransitionMs: 1200 },
  }, {
    intervalScale: 0.27,
    minimumBeatFraction: 0.125,
    gateBeats: 0.08,
    sequence: [0, 12, -5, 7, 3, 19, -12],
    accentEvery: 2,
    bassEvery: 0,
    chordEvery: 0,
  }),
  mode("gagaku", "雅楽", "Breath and sacred space", {
    ...DEFAULT_PRESET,
    name: "水庭の雅楽",
    description: "Slow ceremonial breath, layered sho-like tones, and spacious pauses.",
    root: "D",
    scale: "minor_pentatonic",
    bpm: 48,
    octaveRange: [3, 5],
    mapping: { horizontal: "pan_hue", vertical: "pitch_brightness", speed: "density_saturation" },
    synth: { oscillator: "triangle", attack: 0.28, release: 3.8, reverb: 0.68, filterMinHz: 320, filterMaxHz: 4600 },
    light: { hueRange: [28, 118], saturationRange: [34, 72], brightnessRange: [30, 58], transitionMs: 4200 },
    safety: { maxNotesPerSecond: 1.5, maxGain: 0.46, maxBrightness: 60, minLightTransitionMs: 3200 },
  }, {
    intervalScale: 1.5,
    minimumBeatFraction: 2,
    gateBeats: 3.4,
    sequence: [0, 7, 12, 5],
    accentEvery: 0,
    bassEvery: 0,
    chordEvery: 1,
  }),
] as const;

export const MODE_PRESETS = Object.fromEntries(
  MODE_OPTIONS.map((option) => [option.id, option]),
) as Record<SoundMode, ModeOption>;
