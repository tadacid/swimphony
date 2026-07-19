import type { LightFrame } from "@/lib/performance/mapper";
import type { VisualPresetId } from "@/lib/projection/presets";

export const PROJECTION_CHANNEL = "swimphony-projection-v1";
export const PROJECTION_STORAGE_KEY = "swimphony:projection-signal";

export type ProjectionSignal = {
  version: 1;
  sentAt: number;
  fish: {
    x: number;
    y: number;
    speed: number;
    direction: number;
    acceleration: number;
    confidence: number;
    detected: boolean;
  };
  light: LightFrame;
  note: string | null;
  accent: boolean;
  bpm: number;
  modeLabel: string;
  visualPreset: VisualPresetId;
  audioActive: boolean;
};

export function isProjectionSignal(value: unknown): value is ProjectionSignal {
  if (!value || typeof value !== "object") return false;
  const signal = value as Partial<ProjectionSignal>;
  return signal.version === 1
    && typeof signal.sentAt === "number"
    && typeof signal.fish?.x === "number"
    && typeof signal.fish?.y === "number"
    && typeof signal.fish?.detected === "boolean"
    && typeof signal.light?.hue === "number";
}
