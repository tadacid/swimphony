import type { FishState } from "@/lib/tracking/types";
import { clamp } from "@/lib/utils/math";

type Position = { x: number; y: number };

function positionAt(seconds: number): Position {
  const x =
    0.5 +
    0.33 * Math.sin(seconds * 0.62) +
    0.08 * Math.sin(seconds * 1.73 + 0.8);
  const y =
    0.5 +
    0.27 * Math.sin(seconds * 0.41 + 1.2) +
    0.07 * Math.cos(seconds * 1.19);

  return {
    x: clamp(x, 0.06, 0.94),
    y: clamp(y, 0.08, 0.92),
  };
}

export function simulateFishState(elapsedMs: number): FishState {
  const seconds = elapsedMs / 1000;
  const dt = 0.1;
  const current = positionAt(seconds);
  const previous = positionAt(Math.max(0, seconds - dt));
  const beforePrevious = positionAt(Math.max(0, seconds - dt * 2));

  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const previousDx = previous.x - beforePrevious.x;
  const previousDy = previous.y - beforePrevious.y;

  const speed = clamp(Math.hypot(dx, dy) / dt / 0.45, 0, 1);
  const previousSpeed = clamp(
    Math.hypot(previousDx, previousDy) / dt / 0.45,
    0,
    1,
  );

  const hiddenWindow = Math.sin(seconds * 0.17 + 2.1) > 0.985;
  const confidence = hiddenWindow
    ? 0.28
    : clamp(0.82 + 0.11 * Math.sin(seconds * 0.53), 0.55, 0.95);

  return {
    x: current.x,
    y: current.y,
    speed,
    direction: Math.atan2(dy, dx),
    acceleration: clamp((speed - previousSpeed) / dt / 4, -1, 1),
    area: clamp(
      0.014 + 0.005 * Math.sin(seconds * 0.37 + current.x * Math.PI),
      0.006,
      0.03,
    ),
    confidence,
    detected: confidence >= 0.35,
    timestamp: elapsedMs,
    source: "sample-telemetry",
  };
}
