import type { PerformanceFrame } from "@/lib/performance/mapper";
import type { FishState } from "@/lib/tracking/types";

export type TrailPoint = {
  x: number;
  y: number;
  opacity: number;
};

type AquariumStageProps = {
  fish: FishState;
  frame: PerformanceFrame;
  trail: TrailPoint[];
};

export function AquariumStage({ fish, frame, trail }: AquariumStageProps) {
  return (
    <section className="aquarium-card" aria-label="Aquarium performance stage">
      <div className="aquarium-stage">
        <div className="stage-label">
          <span className="status-dot" data-active={fish.detected} />
          Recorded telemetry preview
        </div>

        <div className="aquarium-grid" aria-hidden="true" />

        <div className="fish-trail" aria-hidden="true">
          {trail.map((point, index) => (
            <span
              key={`${index}-${point.x.toFixed(3)}-${point.y.toFixed(3)}`}
              className="trail-point"
              style={{
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
                opacity: point.opacity,
              }}
            />
          ))}
        </div>

        <div
          className="fish-marker"
          data-detected={fish.detected}
          style={{
            left: `${fish.x * 100}%`,
            top: `${fish.y * 100}%`,
          }}
          aria-label={`Fish position x ${fish.x.toFixed(2)}, y ${fish.y.toFixed(2)}`}
        >
          <span className="fish-marker-core" />
          <span className="fish-marker-ring" />
        </div>

        <div className="stage-metrics">
          <div>
            <span>NOTE</span>
            <strong>{frame.note ?? "—"}</strong>
          </div>
          <div>
            <span>SPEED</span>
            <strong>{fish.speed.toFixed(2)}</strong>
          </div>
          <div>
            <span>CONF.</span>
            <strong>{Math.round(fish.confidence * 100)}%</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
