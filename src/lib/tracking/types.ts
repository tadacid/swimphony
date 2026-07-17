export type TrackingSource =
  | "sample-telemetry"
  | "sample-video"
  | "camera"
  | "dual-camera"
  | "iphone-truedepth";

export type FishState = {
  x: number;
  y: number;
  z?: number;
  speed: number;
  direction: number;
  acceleration: number;
  area: number;
  confidence: number;
  detected: boolean;
  timestamp: number;
  source: TrackingSource;
};

export const EMPTY_FISH_STATE: FishState = {
  x: 0.5,
  y: 0.5,
  speed: 0,
  direction: 0,
  acceleration: 0,
  area: 0,
  confidence: 0,
  detected: false,
  timestamp: 0,
  source: "sample-telemetry",
};
