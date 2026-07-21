import type { LightFrame } from "@/lib/performance/mapper";

export type LightMotionMode =
  | "flow"
  | "color-steps"
  | "beat-palette"
  | "party-edge";

export const LIGHT_MOTION_OPTIONS: readonly {
  id: LightMotionMode;
  label: string;
  cue: string;
  brightness: string;
}[] = [
  { id: "flow", label: "Flow", cue: "なめらかな色の流れ", brightness: "8–100%" },
  { id: "color-steps", label: "Color Steps", cue: "色をパラパラ段階切替", brightness: "100%" },
  { id: "beat-palette", label: "Beat Palette", cue: "1拍ごとに色を即時切替", brightness: "100%" },
  { id: "party-edge", label: "Party Edge", cue: "1拍ごとにランダム風の色と強弱", brightness: "65 / 100%" },
];

const STEP_PALETTE = [8, 48, 92, 156, 205, 268, 322] as const;
const BEAT_PALETTE = [8, 188, 72, 286] as const;
const PARTY_PALETTE = [4, 38, 82, 154, 188, 222, 278, 326] as const;

function pseudoRandomStep(step: number): number {
  let value = (step + 1) * 0x45d9f3b;
  value = ((value >>> 16) ^ value) * 0x45d9f3b;
  return ((value >>> 16) ^ value) >>> 0;
}

export function applyLightMotion(
  light: LightFrame,
  mode: LightMotionMode,
  elapsedMs: number,
  bpm: number,
): LightFrame {
  if (mode === "flow") return light;

  const beatMs = 60_000 / Math.max(40, Math.min(180, bpm));
  const intervalMs = mode === "beat-palette" || mode === "party-edge"
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

  if (mode === "beat-palette") return {
    ...light,
    hue: BEAT_PALETTE[step % BEAT_PALETTE.length] ?? BEAT_PALETTE[0],
    saturation: Math.max(90, light.saturation),
    brightness: 100,
    transitionMs: 0,
  };

  const random = pseudoRandomStep(step);
  return {
    ...light,
    hue: PARTY_PALETTE[random % PARTY_PALETTE.length] ?? PARTY_PALETTE[0],
    saturation: 90,
    brightness: (random >>> 4) % 2 === 0 ? 100 : 65,
    transitionMs: 0,
  };
}
