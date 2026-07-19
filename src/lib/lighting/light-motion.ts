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
const BEAT_OFFSETS = [0, 175, 62, 238] as const;

function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

export function applyLightMotion(
  light: LightFrame,
  mode: LightMotionMode,
  elapsedMs: number,
  bpm: number,
): LightFrame {
  if (mode === "flow") return light;

  const beatMs = 60_000 / Math.max(40, Math.min(180, bpm));
  const intervalMs = Math.max(900, beatMs * 2);
  const step = Math.floor(Math.max(0, elapsedMs) / intervalMs);

  if (mode === "color-steps") {
    const fishColorIndex = Math.round(wrapHue(light.hue) / 52);
    const paletteIndex = (fishColorIndex + step) % STEP_PALETTE.length;
    return {
      ...light,
      hue: STEP_PALETTE[paletteIndex] ?? STEP_PALETTE[0],
      saturation: Math.max(72, light.saturation),
      transitionMs: 1200,
    };
  }

  const baseHue = Math.round(wrapHue(light.hue) / 30) * 30;
  return {
    ...light,
    hue: wrapHue(baseHue + (BEAT_OFFSETS[step % BEAT_OFFSETS.length] ?? 0)),
    saturation: Math.max(80, light.saturation),
    transitionMs: 1200,
  };
}
