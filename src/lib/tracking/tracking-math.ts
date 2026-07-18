import type { FishState, TrackingSource } from "@/lib/tracking/types";
import { clamp } from "@/lib/utils/math";

export type Point = { x: number; y: number };

export type AquariumRoi = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CandidateSignals = {
  colorSimilarity: number;
  motionScore: number;
  previousPositionProximity: number;
  shapeScore: number;
};

export const DEFAULT_AQUARIUM_ROI: AquariumRoi = {
  x: 0.035,
  y: 0.09,
  width: 0.93,
  height: 0.82,
};

export const TRACKING_TUNING = {
  analysisWidth: 480,
  trackingIntervalMs: 83,
  maskThreshold: 0.42,
  positionAlpha: 0.34,
  speedAlpha: 0.22,
  areaAlpha: 0.18,
  missedFrameHold: 4,
  weights: {
    colorSimilarity: 0.45,
    motionScore: 0.25,
    previousPositionProximity: 0.2,
    shapeScore: 0.1,
  },
} as const;

export function clampRoi(roi: AquariumRoi): AquariumRoi {
  const width = clamp(roi.width, 0.08, 1);
  const height = clamp(roi.height, 0.08, 1);

  return {
    x: clamp(roi.x, 0, 1 - width),
    y: clamp(roi.y, 0, 1 - height),
    width,
    height,
  };
}

export function roiFromPoints(start: Point, end: Point): AquariumRoi {
  return clampRoi({
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  });
}

export function aquariumRoiFromGesture(start: Point, end: Point): AquariumRoi {
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  if (width < 0.18 || height < 0.18) return DEFAULT_AQUARIUM_ROI;
  return roiFromPoints(start, end);
}

export function normalizePointToRoi(
  point: Point,
  roi: AquariumRoi,
): Point {
  return {
    x: clamp((point.x - roi.x) / roi.width, 0, 1),
    y: clamp((point.y - roi.y) / roi.height, 0, 1),
  };
}

export function pointFromRoi(point: Point, roi: AquariumRoi): Point {
  return {
    x: roi.x + point.x * roi.width,
    y: roi.y + point.y * roi.height,
  };
}

export function ema(previous: number, next: number, alpha: number): number {
  return previous + (next - previous) * clamp(alpha, 0, 1);
}

export function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function scoreCandidate(
  signals: CandidateSignals,
  weights = TRACKING_TUNING.weights,
): number {
  return clamp(
    clamp(signals.colorSimilarity, 0, 1) * weights.colorSimilarity +
      clamp(signals.motionScore, 0, 1) * weights.motionScore +
      clamp(signals.previousPositionProximity, 0, 1) *
        weights.previousPositionProximity +
      clamp(signals.shapeScore, 0, 1) * weights.shapeScore,
    0,
    1,
  );
}

export function confidenceFromScores(
  bestScore: number,
  secondBestScore: number,
  continuity: number,
): number {
  const margin = Math.max(0, bestScore - secondBestScore);
  return clamp(
    bestScore * 0.82 + margin * 0.32 + clamp(continuity, 0, 1) * 0.12,
    0,
    1,
  );
}

export function updateFishMotion(
  position: Point,
  area: number,
  confidence: number,
  timestamp: number,
  previous?: FishState,
  source: TrackingSource = "sample-video",
): FishState {
  if (!previous || timestamp <= previous.timestamp) {
    return {
      x: position.x,
      y: position.y,
      speed: 0,
      direction: previous?.direction ?? 0,
      acceleration: 0,
      area,
      confidence,
      detected: true,
      timestamp,
      source,
    };
  }

  const x = ema(previous.x, position.x, TRACKING_TUNING.positionAlpha);
  const y = ema(previous.y, position.y, TRACKING_TUNING.positionAlpha);
  const dt = Math.max(0.001, (timestamp - previous.timestamp) / 1000);
  const dx = x - previous.x;
  const dy = y - previous.y;
  const rawSpeed = clamp(Math.hypot(dx, dy) / dt / 0.65, 0, 1);
  const speed = ema(previous.speed, rawSpeed, TRACKING_TUNING.speedAlpha);
  const direction = Math.hypot(dx, dy) > 0.0005
    ? Math.atan2(dy, dx)
    : previous.direction;
  const acceleration = clamp((speed - previous.speed) / dt / 4, -1, 1);

  return {
    x,
    y,
    speed,
    direction,
    acceleration,
    area: ema(previous.area, area, TRACKING_TUNING.areaAlpha),
    confidence,
    detected: true,
    timestamp,
    source,
  };
}

export function holdLostFish(
  previous: FishState | undefined,
  timestamp: number,
  missedFrames: number,
  source: TrackingSource = "sample-video",
): FishState {
  if (!previous) {
    return {
      x: 0.5,
      y: 0.5,
      speed: 0,
      direction: 0,
      acceleration: 0,
      area: 0,
      confidence: 0,
      detected: false,
      timestamp,
      source,
    };
  }

  const decay = missedFrames <= TRACKING_TUNING.missedFrameHold ? 0.74 : 0.52;
  const confidence = previous.confidence * decay;

  return {
    ...previous,
    speed: previous.speed * 0.68,
    acceleration: Math.min(0, previous.acceleration) * 0.5,
    confidence,
    detected:
      missedFrames <= TRACKING_TUNING.missedFrameHold && confidence >= 0.35,
    timestamp,
    source,
  };
}
