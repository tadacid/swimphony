export const VISUAL_PRESETS = [
  {
    id: "golden-trail",
    label: "金色の光跡",
    cue: "泳いだ道が、柔らかな金色として残る",
  },
] as const;

export type VisualPresetId = (typeof VISUAL_PRESETS)[number]["id"];

export const DEFAULT_VISUAL_PRESET: VisualPresetId = "golden-trail";
