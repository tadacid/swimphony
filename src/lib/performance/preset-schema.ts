import { z } from "zod";

export const ScaleNameSchema = z.enum([
  "major_pentatonic",
  "minor_pentatonic",
  "dorian",
  "major",
  "minor",
]);

const BasePerformancePresetSchema = z
  .object({
    name: z.string().min(1).max(60),
    description: z.string().min(1).max(180),
    root: z.enum(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]),
    scale: ScaleNameSchema,
    bpm: z.number().min(40).max(140),
    octaveRange: z.tuple([
      z.number().int().min(2).max(5),
      z.number().int().min(3).max(6),
    ]),
    synth: z
      .object({
        oscillator: z.enum(["sine", "triangle", "sawtooth", "square"]),
        attack: z.number().min(0.01).max(3),
        release: z.number().min(0.05).max(8),
        reverb: z.number().min(0).max(0.8),
        filterMinHz: z.number().min(120).max(4000),
        filterMaxHz: z.number().min(800).max(12000),
      })
      .strict(),
    light: z
      .object({
        hueRange: z.tuple([
          z.number().min(0).max(360),
          z.number().min(0).max(360),
        ]),
        saturationRange: z.tuple([
          z.number().min(0).max(100),
          z.number().min(0).max(100),
        ]),
        brightnessRange: z.tuple([
          z.number().min(8).max(60),
          z.number().min(12).max(60),
        ]),
        transitionMs: z.number().int().min(1200).max(6000),
      })
      .strict(),
    safety: z
      .object({
        maxNotesPerSecond: z.number().min(0.5).max(8),
        maxGain: z.number().min(0.05).max(0.75),
        maxBrightness: z.number().min(15).max(60),
        minLightTransitionMs: z.number().int().min(1200).max(6000),
      })
      .strict(),
  })
  .strict();

type BasePerformancePreset = z.infer<typeof BasePerformancePresetSchema>;

export const PerformancePresetSchema = BasePerformancePresetSchema
  .refine((preset: BasePerformancePreset) => preset.octaveRange[0] <= preset.octaveRange[1], {
    message: "octaveRange must be ascending",
    path: ["octaveRange"],
  })
  .refine((preset: BasePerformancePreset) => preset.synth.filterMinHz < preset.synth.filterMaxHz, {
    message: "filterMinHz must be lower than filterMaxHz",
    path: ["synth", "filterMinHz"],
  });

export type PerformancePreset = z.infer<typeof PerformancePresetSchema>;
export type ScaleName = z.infer<typeof ScaleNameSchema>;
