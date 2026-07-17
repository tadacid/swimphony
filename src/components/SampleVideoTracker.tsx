"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { TrailPoint } from "@/components/AquariumStage";
import {
  CanvasFishTracker,
  drawVideoFrame,
  type ColorProfile,
  type TrackerContour,
  type TrackingFrame,
} from "@/lib/tracking/canvas-tracker";
import {
  DEFAULT_AQUARIUM_ROI,
  pointFromRoi,
  roiFromPoints,
  TRACKING_TUNING,
  type AquariumRoi,
  type Point,
} from "@/lib/tracking/tracking-math";
import type { FishState } from "@/lib/tracking/types";
import type { PerformanceFrame } from "@/lib/performance/mapper";

type InteractionMode = "roi" | "color" | "idle";

type SampleVideoTrackerProps = {
  fish: FishState;
  frame: PerformanceFrame;
  trail: TrailPoint[];
  onFishState: (fish: FishState) => void;
};

function pointFromEvent(event: ReactPointerEvent<HTMLDivElement>): Point {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  };
}

function drawMask(
  canvas: HTMLCanvasElement,
  result: TrackingFrame | null,
  visible: boolean,
): void {
  if (!result || !visible) {
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  canvas.width = result.analysisWidth;
  canvas.height = result.analysisHeight;
  const context = canvas.getContext("2d");
  if (!context) return;
  const image = context.createImageData(result.analysisWidth, result.analysisHeight);

  for (let index = 0; index < result.mask.length; index += 1) {
    if (!result.mask[index]) continue;
    const target = index * 4;
    image.data[target] = 220;
    image.data[target + 1] = 255;
    image.data[target + 2] = 114;
    image.data[target + 3] = 92;
  }

  context.putImageData(image, 0, 0);
}

export function SampleVideoTracker({
  fish,
  frame,
  trail,
  onFishState,
}: SampleVideoTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef(new CanvasFishTracker());
  const dragStartRef = useRef<Point | null>(null);
  const latestResultRef = useRef<TrackingFrame | null>(null);
  const [roi, setRoi] = useState<AquariumRoi>(DEFAULT_AQUARIUM_ROI);
  const [profile, setProfile] = useState<ColorProfile | null>(null);
  const [contour, setContour] = useState<TrackerContour | null>(null);
  const [interaction, setInteraction] = useState<InteractionMode>("roi");
  const [tracking, setTracking] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showMask, setShowMask] = useState(true);
  const [candidateCount, setCandidateCount] = useState(0);
  const [message, setMessage] = useState(
    "Drag a box around the inside of the aquarium.",
  );

  const processCurrentFrame = useCallback(
    (timestamp: number, activeProfile: ColorProfile) => {
      const video = videoRef.current;
      const analysisCanvas = analysisCanvasRef.current;
      if (!video || !analysisCanvas) return null;
      const context = drawVideoFrame(video, analysisCanvas);
      if (!context) return null;
      const result = trackerRef.current.process(
        context,
        roi,
        activeProfile,
        timestamp,
      );
      latestResultRef.current = result;
      setContour(result.contour);
      setCandidateCount(result.candidateCount);
      if (maskCanvasRef.current) {
        drawMask(maskCanvasRef.current, result, showMask);
      }
      onFishState(result.fish);
      return result;
    },
    [onFishState, roi, showMask],
  );

  useEffect(() => {
    if (!tracking || !profile) return;
    let animationFrame = 0;
    let lastTrackedAt = 0;

    const tick = (now: number) => {
      const video = videoRef.current;
      if (
        video &&
        !video.paused &&
        !video.ended &&
        now - lastTrackedAt >= TRACKING_TUNING.trackingIntervalMs
      ) {
        processCurrentFrame(video.currentTime * 1000, profile);
        lastTrackedAt = now;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [processCurrentFrame, profile, tracking]);

  useEffect(() => {
    const video = videoRef.current;
    return () => video?.pause();
  }, []);

  function selectRoiMode() {
    videoRef.current?.pause();
    setTracking(false);
    setInteraction("roi");
    setMessage("Drag from one corner of the aquarium interior to the opposite corner.");
  }

  function selectColorMode() {
    videoRef.current?.pause();
    setTracking(false);
    setInteraction("color");
    setMessage("Click the orange body of the fish. The green mask previews the match.");
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const point = pointFromEvent(event);
    if (interaction === "roi") {
      dragStartRef.current = point;
      event.currentTarget.setPointerCapture(event.pointerId);
      setRoi(roiFromPoints(point, point));
      return;
    }

    if (interaction !== "color") return;
    const video = videoRef.current;
    const canvas = analysisCanvasRef.current;
    if (!video || !canvas) return;
    const context = drawVideoFrame(video, canvas);
    if (!context) return;
    const sampled = trackerRef.current.sampleColor(context, point);
    trackerRef.current.reset();
    setProfile(sampled);
    setInteraction("idle");
    processCurrentFrame(video.currentTime * 1000, sampled);
    setMessage("Color captured. Check the mask, then confirm and start tracking.");
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (interaction !== "roi" || !dragStartRef.current) return;
    setRoi(roiFromPoints(dragStartRef.current, pointFromEvent(event)));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (interaction !== "roi" || !dragStartRef.current) return;
    const nextRoi = roiFromPoints(dragStartRef.current, pointFromEvent(event));
    dragStartRef.current = null;
    setRoi(nextRoi);
    setProfile(null);
    setContour(null);
    trackerRef.current.reset();
    if (maskCanvasRef.current) drawMask(maskCanvasRef.current, null, false);
    setInteraction("color");
    setMessage("Aquarium set. Now click the orange body of the fish.");
  }

  async function startTracking() {
    const video = videoRef.current;
    if (!video || !profile) return;
    trackerRef.current.reset();
    setInteraction("idle");
    try {
      await video.play();
      setTracking(true);
      setMessage("Tracking at 12 Hz. Sound and light use the same FishState.");
    } catch (error) {
      console.error(error);
      setMessage("The sample video could not start. Try the play button again.");
    }
  }

  function pauseTracking() {
    videoRef.current?.pause();
    setTracking(false);
    setMessage("Paused. Adjust the ROI or sample the fish again if needed.");
  }

  function seekBy(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setTracking(false);
    video.currentTime = Math.min(
      Math.max(0, video.currentTime + seconds),
      Math.max(0, video.duration - 0.1),
    );
  }

  function handleSeeked() {
    if (profile) {
      trackerRef.current.reset();
      processCurrentFrame((videoRef.current?.currentTime ?? 0) * 1000, profile);
    }
  }

  function handleVideoReady() {
    const video = videoRef.current;
    if (!video) return;
    setVideoReady(true);
    video.pause();
    if (video.duration > 4) video.currentTime = 3;
    setMessage("Video ready. Drag a box around the aquarium interior.");
  }

  function handleVideoEnded() {
    setTracking(false);
    setMessage("Sample complete. Replay it or adjust calibration.");
  }

  const marker = pointFromRoi({ x: fish.x, y: fish.y }, roi);

  return (
    <section className="aquarium-card sample-video-card" aria-label="Sample video tracker">
      <div className="sample-video-frame">
        <video
          ref={videoRef}
          src="/demo/goldfish-demo.mp4"
          playsInline
          muted
          preload="auto"
          onLoadedData={handleVideoReady}
          onSeeked={handleSeeked}
          onEnded={handleVideoEnded}
        />
        <canvas ref={maskCanvasRef} className="tracking-mask" aria-hidden="true" />
        <div
          className="tracking-interaction"
          data-mode={interaction}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className="roi-outline"
            style={{
              left: `${roi.x * 100}%`,
              top: `${roi.y * 100}%`,
              width: `${roi.width * 100}%`,
              height: `${roi.height * 100}%`,
            }}
          >
            <span>AQUARIUM ROI</span>
          </div>

          {contour ? (
            <div
              className="tracking-contour"
              style={{
                left: `${contour.x * 100}%`,
                top: `${contour.y * 100}%`,
                width: `${contour.width * 100}%`,
                height: `${contour.height * 100}%`,
              }}
            />
          ) : null}

          <div className="fish-trail" aria-hidden="true">
            {trail.map((point, index) => {
              const displayPoint = pointFromRoi(point, roi);
              return (
                <span
                  key={`${index}-${point.x.toFixed(3)}-${point.y.toFixed(3)}`}
                  className="trail-point"
                  style={{
                    left: `${displayPoint.x * 100}%`,
                    top: `${displayPoint.y * 100}%`,
                    opacity: point.opacity,
                  }}
                />
              );
            })}
          </div>

          {profile ? (
            <div
              className="fish-marker"
              data-detected={fish.detected}
              style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
              aria-label={`Fish position x ${fish.x.toFixed(2)}, y ${fish.y.toFixed(2)}`}
            >
              <span className="fish-marker-core" />
              <span className="fish-marker-ring" />
            </div>
          ) : null}
        </div>

        <div className="stage-label sample-stage-label">
          <span className="status-dot" data-active={fish.detected && tracking} />
          {tracking ? "Sample video · tracking" : "Sample video · calibration"}
        </div>

        <div className="video-time-controls">
          <button type="button" onClick={() => seekBy(-2)} disabled={!videoReady}>
            −2s
          </button>
          <button type="button" onClick={() => seekBy(2)} disabled={!videoReady}>
            +2s
          </button>
        </div>
      </div>

      <div className="tracking-console">
        <div className="calibration-flow" aria-label="Tracking calibration">
          <button
            type="button"
            data-active={interaction === "roi"}
            onClick={selectRoiMode}
          >
            <span>01</span> Set aquarium
          </button>
          <button
            type="button"
            data-active={interaction === "color"}
            onClick={selectColorMode}
            disabled={!videoReady}
          >
            <span>02</span> Sample fish
          </button>
          <button
            type="button"
            data-active={tracking}
            onClick={tracking ? pauseTracking : startTracking}
            disabled={!profile}
          >
            <span>03</span> {tracking ? "Pause tracking" : "Confirm & track"}
          </button>
        </div>

        <div className="tracking-readout">
          <p>{message}</p>
          <label>
            <input
              type="checkbox"
              checked={showMask}
              onChange={(event) => {
                const visible = event.target.checked;
                setShowMask(visible);
                if (maskCanvasRef.current) {
                  drawMask(maskCanvasRef.current, latestResultRef.current, visible);
                }
              }}
            />
            Mask
          </label>
        </div>

        <div className="tracking-metrics">
          <div><span>X</span><strong>{fish.x.toFixed(2)}</strong></div>
          <div><span>Y</span><strong>{fish.y.toFixed(2)}</strong></div>
          <div><span>SPEED</span><strong>{fish.speed.toFixed(2)}</strong></div>
          <div><span>AREA</span><strong>{(fish.area * 100).toFixed(2)}%</strong></div>
          <div><span>DIR.</span><strong>{Math.round((fish.direction * 180) / Math.PI)}°</strong></div>
          <div><span>CONF.</span><strong>{Math.round(fish.confidence * 100)}%</strong></div>
          <div><span>NOTE</span><strong>{frame.note ?? "—"}</strong></div>
        </div>

        <details className="tracking-debug">
          <summary>Debug</summary>
          <span>Candidates {candidateCount}</span>
          <span>Hue {profile ? Math.round(profile.hue) : "—"}</span>
          <span>ROI {Math.round(roi.width * 100)} × {Math.round(roi.height * 100)}%</span>
        </details>
      </div>
      <canvas ref={analysisCanvasRef} className="analysis-canvas" aria-hidden="true" />
    </section>
  );
}
