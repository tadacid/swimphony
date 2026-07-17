import type {
  PerformancePreset,
  ScaleName,
} from "@/lib/performance/preset-schema";
import type { FishState } from "@/lib/tracking/types";
import { clamp, lerp, mapRange } from "@/lib/utils/math";

const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const ROOT_SEMITONES: Record<PerformancePreset["root"], number> = {
  C: 0,
  "C#": 1,
  D: 2,
  "D#": 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  "G#": 8,
  A: 9,
  "A#": 10,
  B: 11,
};

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type LightFrame = {
  hue: number;
  saturation: number;
  brightness: number;
  transitionMs: number;
};

export type PerformanceFrame = {
  note: string | null;
  pan: number;
  velocity: number;
  filterHz: number;
  noteIntervalMs: number;
  accent: boolean;
  light: LightFrame;
};

function midiToNote(midi: number): string {
  const rounded = Math.round(midi);
  const note = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${note}${octave}`;
}

function noteFromVerticalPosition(
  y: number,
  preset: PerformancePreset,
): string {
  const intervals = SCALE_INTERVALS[preset.scale];
  const [lowOctave, highOctave] = preset.octaveRange;
  const scaleNotes: number[] = [];
  const root = ROOT_SEMITONES[preset.root];

  for (let octave = lowOctave; octave <= highOctave; octave += 1) {
    for (const interval of intervals) {
      scaleNotes.push((octave + 1) * 12 + root + interval);
    }
  }

  const inverted = 1 - clamp(y, 0, 1);
  const index = Math.round(inverted * (scaleNotes.length - 1));
  return midiToNote(scaleNotes[index] ?? scaleNotes[0] ?? 60);
}

export function mapFishToPerformance(
  fish: FishState,
  preset: PerformancePreset,
): PerformanceFrame {
  const confidenceFactor = clamp(
    (fish.confidence - 0.25) / (0.8 - 0.25),
    0,
    1,
  );
  const detectedFactor = fish.detected ? 1 : 0;

  const notesPerSecond = lerp(
    0.6,
    preset.safety.maxNotesPerSecond,
    clamp(fish.speed, 0, 1),
  );

  const lightHue = lerp(
    preset.light.hueRange[0],
    preset.light.hueRange[1],
    fish.x,
  );
  const lightSaturation =
    lerp(
      preset.light.saturationRange[0],
      preset.light.saturationRange[1],
      fish.speed,
    ) *
    lerp(0.55, 1, confidenceFactor);
  const requestedBrightness = lerp(
    preset.light.brightnessRange[0],
    preset.light.brightnessRange[1],
    1 - fish.y,
  );

  return {
    note: fish.detected ? noteFromVerticalPosition(fish.y, preset) : null,
    pan: mapRange(fish.x, 0, 1, -1, 1),
    velocity:
      preset.safety.maxGain *
      lerp(0.35, 1, fish.speed) *
      confidenceFactor *
      detectedFactor,
    filterHz: lerp(
      preset.synth.filterMinHz,
      preset.synth.filterMaxHz,
      clamp(fish.area / 0.03, 0, 1),
    ),
    noteIntervalMs: 1000 / Math.max(0.1, notesPerSecond),
    accent:
      fish.detected &&
      confidenceFactor > 0.5 &&
      Math.abs(fish.acceleration) > 0.32,
    light: {
      hue: lightHue,
      saturation: clamp(lightSaturation, 0, 100),
      brightness: fish.detected
        ? clamp(
            requestedBrightness * lerp(0.55, 1, confidenceFactor),
            8,
            preset.safety.maxBrightness,
          )
        : Math.min(12, preset.safety.maxBrightness),
      transitionMs: Math.max(
        preset.light.transitionMs,
        preset.safety.minLightTransitionMs,
      ),
    },
  };
}
