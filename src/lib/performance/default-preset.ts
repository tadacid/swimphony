import type { PerformancePreset } from "@/lib/performance/preset-schema";

export const DEFAULT_PRESET: PerformancePreset = {
  name: "Midnight Aquarium",
  description: "Quiet glassy tones with slow blue-green ambient light.",
  root: "D",
  scale: "minor_pentatonic",
  bpm: 64,
  octaveRange: [3, 5],
  mapping: {
    horizontal: "pan_hue",
    vertical: "pitch_brightness",
    speed: "density_saturation",
  },
  synth: {
    oscillator: "sine",
    attack: 0.45,
    release: 2.4,
    reverb: 0.48,
    filterMinHz: 420,
    filterMaxHz: 4800,
  },
  light: {
    hueRange: [184, 245],
    saturationRange: [42, 78],
    brightnessRange: [18, 46],
    transitionMs: 2200,
  },
  safety: {
    maxNotesPerSecond: 4,
    maxGain: 0.58,
    maxBrightness: 52,
    minLightTransitionMs: 1500,
  },
};
