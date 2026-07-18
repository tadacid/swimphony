import type { LightFrame, PerformanceFrame } from "@/lib/performance/mapper";
import type { PerformancePreset } from "@/lib/performance/preset-schema";
import { clamp } from "@/lib/utils/math";

const NOTE_HUES: Record<string, number> = {
  C: 0,
  "C#": 30,
  D: 60,
  "D#": 90,
  E: 120,
  F: 150,
  "F#": 180,
  G: 210,
  "G#": 240,
  A: 270,
  "A#": 300,
  B: 330,
};

const TIMBRE_HUE_OFFSET: Record<PerformancePreset["synth"]["oscillator"], number> = {
  sine: 0,
  triangle: 34,
  sawtooth: 72,
  square: 108,
};

function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function blendHue(first: number, second: number, weight: number): number {
  const from = wrapHue(first);
  const delta = ((wrapHue(second) - from + 540) % 360) - 180;
  return wrapHue(from + delta * clamp(weight, 0, 1));
}

function noteHue(note: string): number | null {
  const match = /^([A-G]#?)/.exec(note);
  return match ? NOTE_HUES[match[1]] ?? null : null;
}

export function audioReactiveLight(
  frame: PerformanceFrame,
  preset: PerformancePreset,
  elapsedMs: number,
): LightFrame {
  if (!frame.note) return frame.light;

  const pitchHue = noteHue(frame.note);
  if (pitchHue === null) return frame.light;

  const fourBeatDurationMs = (60_000 / preset.bpm) * 4;
  const phrase = Math.sin((elapsedMs / fourBeatDurationMs) * Math.PI * 2);
  const timbreOffset = TIMBRE_HUE_OFFSET[preset.synth.oscillator];
  const energy = clamp(frame.velocity / Math.max(0.05, preset.safety.maxGain), 0, 1);

  return {
    hue: wrapHue(
      blendHue(frame.light.hue, pitchHue, 0.72) + timbreOffset + phrase * 24,
    ),
    saturation: clamp(
      Math.max(58, frame.light.saturation) + energy * 22 + (frame.accent ? 8 : 0),
      0,
      90,
    ),
    brightness: clamp(
      Math.max(70, frame.light.brightness) + energy * 25 + (frame.accent ? 5 : 0),
      65,
      100,
    ),
    transitionMs: Math.round(clamp(1900 - energy * 350, 1500, 1900)),
  };
}
