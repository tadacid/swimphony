"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { TrailPoint } from "@/components/AquariumStage";
import {
  CAMERA_CALIBRATION_STORAGE_KEY,
  parseCameraCalibration,
  serializeCameraCalibration,
} from "@/lib/tracking/camera-calibration";
import {
  CanvasFishTracker,
  drawVideoFrame,
  GOLDFISH_RECOVERY_PROFILE,
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

type TrackedMediaProps = SampleVideoTrackerProps & {
  mediaKind: "sample-video" | "camera";
  onCameraUnavailable?: (message: string) => void;
  onCameraReady?: () => void;
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

function cameraFailureMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Camera permission was denied. Recorded telemetry is running instead.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No camera was found. Recorded telemetry is running instead.";
  }
  return "The camera could not start. Recorded telemetry is running instead.";
}

function TrackedMedia({
  fish,
  frame,
  trail,
  onFishState,
  mediaKind,
  onCameraUnavailable,
  onCameraReady,
}: TrackedMediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef(new CanvasFishTracker(mediaKind));
  const dragStartRef = useRef<Point | null>(null);
  const latestResultRef = useRef<TrackingFrame | null>(null);
  const autoResumeRef = useRef(false);
  const lostFrameCountRef = useRef(0);
  const [roi, setRoi] = useState<AquariumRoi>(DEFAULT_AQUARIUM_ROI);
  const [profile, setProfile] = useState<ColorProfile | null>(null);
  const [contour, setContour] = useState<TrackerContour | null>(null);
  const [interaction, setInteraction] = useState<InteractionMode>("roi");
  const [tracking, setTracking] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState(16 / 9);
  const [showMask, setShowMask] = useState(true);
  const [candidateCount, setCandidateCount] = useState(0);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [calibrationLoaded, setCalibrationLoaded] = useState(mediaKind !== "camera");
  const [message, setMessage] = useState(
    "Drag a box around the inside of the aquarium.",
  );

  useEffect(() => {
    if (mediaKind !== "camera") return;
    let cancelled = false;
    const saved = parseCameraCalibration(
      window.localStorage.getItem(CAMERA_CALIBRATION_STORAGE_KEY),
    );
    queueMicrotask(() => {
      if (cancelled) return;
      if (saved) {
        setRoi(saved.roi);
        setProfile(saved.profile);
        setSelectedDeviceId(saved.deviceId);
        setInteraction("idle");
        autoResumeRef.current = true;
        setMessage("Saved aquarium and fish calibration loaded.");
      }
      setCalibrationLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mediaKind]);

  useEffect(() => {
    if (mediaKind !== "camera" || !calibrationLoaded) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const videoElement = videoRef.current;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoElement;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        if (video.videoWidth && video.videoHeight) {
          setMediaAspectRatio(video.videoWidth / video.videoHeight);
        }
        const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
          (device) => device.kind === "videoinput",
        );
        if (cancelled) return;
        setCameraDevices(devices);
        const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
        if (!selectedDeviceId && activeDeviceId) setSelectedDeviceId(activeDeviceId);
        setVideoReady(true);
        setMessage("Camera ready. Drag a box around the aquarium interior.");
        onCameraReady?.();
      } catch (error) {
        console.error(error);
        if (
          !cancelled &&
          selectedDeviceId &&
          error instanceof DOMException &&
          (error.name === "NotFoundError" || error.name === "OverconstrainedError")
        ) {
          window.localStorage.removeItem(CAMERA_CALIBRATION_STORAGE_KEY);
          setProfile(null);
          setSelectedDeviceId("");
          autoResumeRef.current = false;
          return;
        }
        if (!cancelled) onCameraUnavailable?.(cameraFailureMessage(error));
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, [calibrationLoaded, mediaKind, onCameraReady, onCameraUnavailable, selectedDeviceId]);

  const processCurrentFrame = useCallback(
    (timestamp: number, activeProfile: ColorProfile) => {
      const video = videoRef.current;
      const analysisCanvas = analysisCanvasRef.current;
      if (!video || !analysisCanvas) return null;
      const context = drawVideoFrame(video, analysisCanvas);
      if (!context) return null;
      let result = trackerRef.current.process(
        context,
        roi,
        activeProfile,
        timestamp,
      );
      if (mediaKind === "camera" && !result.fish.detected) {
        lostFrameCountRef.current += 1;
        if (lostFrameCountRef.current >= 12) {
          lostFrameCountRef.current = 0;
          const recovered = trackerRef.current.process(
            context,
            roi,
            GOLDFISH_RECOVERY_PROFILE,
            timestamp,
          );
          if (recovered.fish.detected) {
            result = recovered;
            setProfile(GOLDFISH_RECOVERY_PROFILE);
            window.localStorage.setItem(
              CAMERA_CALIBRATION_STORAGE_KEY,
              serializeCameraCalibration(
                selectedDeviceId,
                roi,
                GOLDFISH_RECOVERY_PROFILE,
              ),
            );
            setMessage("Goldfish color recovered automatically. Tracking and sound resumed.");
          }
        }
      } else {
        lostFrameCountRef.current = 0;
      }
      latestResultRef.current = result;
      setContour(result.contour);
      setCandidateCount(result.candidateCount);
      if (maskCanvasRef.current) {
        drawMask(maskCanvasRef.current, result, showMask);
      }
      onFishState(result.fish);
      return result;
    },
    [mediaKind, onFishState, roi, selectedDeviceId, showMask],
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
        processCurrentFrame(
          mediaKind === "camera" ? performance.now() : video.currentTime * 1000,
          profile,
        );
        lastTrackedAt = now;
      }
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [mediaKind, processCurrentFrame, profile, tracking]);

  useEffect(() => {
    if (
      mediaKind !== "camera" ||
      !videoReady ||
      !profile ||
      !autoResumeRef.current
    ) {
      return;
    }
    autoResumeRef.current = false;
    trackerRef.current.reset();
    setInteraction("idle");
    setTracking(true);
    setMessage("Saved calibration restored. Tracking started automatically.");
  }, [mediaKind, profile, videoReady]);

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
    const sampledAt = mediaKind === "camera"
      ? performance.now()
      : video.currentTime * 1000;
    trackerRef.current.reset();
    trackerRef.current.seedPosition(point, roi, sampledAt);
    setProfile(sampled);
    if (mediaKind === "camera") {
      window.localStorage.setItem(
        CAMERA_CALIBRATION_STORAGE_KEY,
        serializeCameraCalibration(selectedDeviceId, roi, sampled),
      );
    }
    setInteraction("idle");
    processCurrentFrame(sampledAt, sampled);
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
    if (mediaKind === "camera") {
      window.localStorage.removeItem(CAMERA_CALIBRATION_STORAGE_KEY);
      autoResumeRef.current = false;
    }
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
    if (mediaKind === "camera") return;
    setVideoReady(true);
    if (video.videoWidth && video.videoHeight) {
      setMediaAspectRatio(video.videoWidth / video.videoHeight);
    }
    video.pause();
    if (video.duration > 4) video.currentTime = 3;
    setMessage("Video ready. Drag a box around the aquarium interior.");
  }

  function handleVideoEnded() {
    setTracking(false);
    setMessage("Sample complete. Replay it or adjust calibration.");
  }

  const marker = pointFromRoi({ x: fish.x, y: fish.y }, roi);
  const sourceLabel = mediaKind === "camera" ? "Live camera" : "Sample video";

  return (
    <section className="aquarium-card sample-video-card" aria-label={`${sourceLabel} tracker`}>
      <div className="sample-video-frame" style={{ aspectRatio: mediaAspectRatio }}>
        <video
          ref={videoRef}
          src={mediaKind === "sample-video" ? "/demo/goldfish-demo.mp4" : undefined}
          playsInline
          muted
          preload="auto"
          onLoadedData={mediaKind === "sample-video" ? handleVideoReady : undefined}
          onSeeked={mediaKind === "sample-video" ? handleSeeked : undefined}
          onEnded={mediaKind === "sample-video" ? handleVideoEnded : undefined}
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
          {sourceLabel} · {tracking ? "tracking" : "calibration"}
        </div>

        {mediaKind === "sample-video" ? (
          <div className="video-time-controls">
            <button type="button" onClick={() => seekBy(-2)} disabled={!videoReady}>
              −2s
            </button>
            <button type="button" onClick={() => seekBy(2)} disabled={!videoReady}>
              +2s
            </button>
          </div>
        ) : null}
      </div>

      <div className="tracking-console">
        {mediaKind === "camera" ? (
          <label className="camera-device-field">
            <span>CAMERA</span>
            <select
              value={selectedDeviceId}
              onChange={(event) => {
                setTracking(false);
                trackerRef.current.reset();
                setProfile(null);
                window.localStorage.removeItem(CAMERA_CALIBRATION_STORAGE_KEY);
                autoResumeRef.current = false;
                setSelectedDeviceId(event.target.value);
              }}
            >
              {cameraDevices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        ) : null}
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

export function SampleVideoTracker(props: SampleVideoTrackerProps) {
  return <TrackedMedia {...props} mediaKind="sample-video" />;
}

export function LiveCameraTracker(
  props: SampleVideoTrackerProps & {
    onCameraUnavailable: (message: string) => void;
    onCameraReady: () => void;
  },
) {
  return <TrackedMedia {...props} mediaKind="camera" />;
}
