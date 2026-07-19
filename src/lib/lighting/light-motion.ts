import type { LightFrame } from "@/lib/performance/mapper";

export type LightMotionMode = "flow" | "color-steps" | "beat-palette";

export const LIGHT_MOTION_OPTIONS: readonly {
  id: LightMotionMode;
  label: string;
  cue: string;
}[] = [
  { id: "flow", label: "Flow", cue: "なめらかな色の流れ" },
  { id: "color-steps", label: "Color Steps", cue: "色をパラパラ段階切替" },
  { id: "beat-palette", label: "Beat Palette", cue: "ビートごとに大胆な配色" },
];

const STEP_PALETTE = [8, 48, 92, 156, 205, 268, 322] as const;
const BEAT_PALETTE = [8, 188, 72, 286] as const;

export function applyLightMotion(
  light: LightFrame,
  mode: LightMotionMode,
  elapsedMs: number,
  bpm: number,
): LightFrame {
  if (mode === "flow") return light;

  const beatMs = 60_000 / Math.max(40, Math.min(180, bpm));
  const intervalMs = mode === "beat-palette"
    ? beatMs
    : Math.max(550, beatMs * 2);
  const step = Math.floor(Math.max(0, elapsedMs) / intervalMs);

  if (mode === "color-steps") {
    return {
      ...light,
      hue: STEP_PALETTE[step % STEP_PALETTE.length] ?? STEP_PALETTE[0],
      saturation: Math.max(86, light.saturation),
      brightness: 100,
      transitionMs: 120,
    };
  }

  return {
    ...light,
    hue: BEAT_PALETTE[step % BEAT_PALETTE.length] ?? BEAT_PALETTE[0],
    saturation: Math.max(90, light.saturation),
    brightness: 100,
    transitionMs: 0,
  };
}
