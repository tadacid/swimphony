"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AquariumStage,
  type TrailPoint,
} from "@/components/AquariumStage";
import {
  LiveCameraTracker,
  SampleVideoTracker,
} from "@/components/SampleVideoTracker";
import { ToneEngine } from "@/lib/audio/tone-engine";
import { virtualLightStyle } from "@/lib/lighting/virtual-light";
import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import { mapFishToPerformance } from "@/lib/performance/mapper";
import type { PerformancePreset } from "@/lib/performance/preset-schema";
import { simulateFishState } from "@/lib/tracking/simulator";
import { EMPTY_FISH_STATE, type FishState } from "@/lib/tracking/types";

const SAMPLE_PROMPTS = [
  "静かな深夜の水族館。上に泳いだ時は透明感のある高音。急な方向転換だけ金色のアクセント。点滅はなし。",
  "暖かく穏やかな朝。丸い音色とゆっくりした金色と緑の光。急な変化はなし。",
  "少し遊び心のある8-bitの水紋。音は軽やかに、光は落ち着いて絶対に点滅しない。",
] as const;

type PresetResponse = {
  preset: PerformancePreset;
  source: "codex-local" | "fallback";
  model: string;
  warning?: string;
};

type HueStatus = {
  available: boolean;
  enabled: boolean;
  connected: boolean;
  message: string;
};

type ActiveSource = "sample-telemetry" | "sample-video" | "camera";

const SOURCE_LABELS: Record<ActiveSource, string> = {
  "sample-telemetry": "Recorded telemetry",
  "sample-video": "Sample video",
  camera: "Live camera",
};

const MAPPING_LABELS = {
  horizontal: {
    pan_hue: "Pan + hue",
    pan_brightness: "Pan + brightness",
  },
  vertical: {
    pitch_brightness: "Pitch + brightness",
    pitch_hue: "Pitch + hue",
  },
  speed: {
    density_saturation: "Density + saturation",
    density_filter: "Density + filter",
  },
} as const;

export function SwimphonyConsole() {
  const [fish, setFish] = useState<FishState>(() => ({
    ...EMPTY_FISH_STATE,
    source: "camera",
  }));
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [source, setSource] = useState<ActiveSource>("camera");
  const [preset, setPreset] = useState<PerformancePreset>(DEFAULT_PRESET);
  const [prompt, setPrompt] = useState<string>(SAMPLE_PROMPTS[0]);
  const [audioActive, setAudioActive] = useState(false);
  const [presetSource, setPresetSource] = useState<"built-in" | "codex-local" | "fallback">(
    "built-in",
  );
  const [model, setModel] = useState("Local Codex ready");
  const [message, setMessage] = useState(
    "Requesting the saved live camera and fish calibration…",
  );
  const [generating, setGenerating] = useState(false);
  const [hueStatus, setHueStatus] = useState<HueStatus>({
    available: false,
    enabled: false,
    connected: false,
    message: "Checking Hue…",
  });
  const [hueBusy, setHueBusy] = useState(false);
  const engineRef = useRef<ToneEngine | null>(null);
  const lastHueUpdateRef = useRef(0);

  const frame = useMemo(
    () => mapFishToPerformance(fish, preset),
    [fish, preset],
  );

  const acceptFishState = useCallback((nextFish: FishState) => {
    setFish(nextFish);
    setTrail((points) => {
      const next = [
        ...points.map((point) => ({
          ...point,
          opacity: point.opacity * 0.88,
        })),
        {
          x: nextFish.x,
          y: nextFish.y,
          opacity: nextFish.detected ? 0.72 : 0.25,
        },
      ];
      return next.slice(-28);
    });
  }, []);

  useEffect(() => {
    if (source !== "sample-telemetry") return;
    let frameId = 0;
    let lastUpdate = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      if (now - lastUpdate >= 66) {
        acceptFishState(simulateFishState(now - startedAt));
        lastUpdate = now;
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [acceptFishState, source]);

  useEffect(() => {
    if (audioActive) {
      engineRef.current?.update(frame);
    }
  }, [audioActive, frame]);

  useEffect(() => {
    if (audioActive) {
      engineRef.current?.applyPreset(preset);
    }
  }, [audioActive, preset]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hue")
      .then(async (response) => {
        if (!response.ok) throw new Error("Hue status failed");
        return response.json() as Promise<HueStatus>;
      })
      .then((status) => {
        if (!cancelled) setHueStatus(status);
      })
      .catch(() => {
        if (!cancelled) {
          setHueStatus({
            available: false,
            enabled: false,
            connected: false,
            message: "Hue status unavailable.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hueStatus.enabled) return;
    const now = performance.now();
    if (now - lastHueUpdateRef.current < 1000) return;
    lastHueUpdateRef.current = now;
    void fetch("/api/hue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ light: frame.light, confidence: fish.confidence }),
    })
      .then((response) => {
        if (!response.ok) {
          setHueStatus((status) => ({
            ...status,
            connected: false,
            message: "Hue paused; Virtual Light is still running.",
          }));
        }
      })
      .catch(() => {
        setHueStatus((status) => ({
          ...status,
          connected: false,
          message: "Hue paused; Virtual Light is still running.",
        }));
      });
  }, [fish.confidence, frame.light, hueStatus.enabled]);

  useEffect(() => {
    return () => engineRef.current?.stop();
  }, []);

  async function toggleAudio() {
    if (audioActive) {
      engineRef.current?.stop();
      engineRef.current = null;
      setAudioActive(false);
      setMessage("Audio stopped. Visual telemetry continues.");
      return;
    }

    try {
      const engine = new ToneEngine();
      await engine.start(preset);
      engineRef.current = engine;
      setAudioActive(true);
      setMessage("Audio is live. The current FishState now controls the synth.");
    } catch (error) {
      console.error(error);
      setMessage("Audio could not start. Check browser audio permissions.");
    }
  }

  function selectSource(nextSource: ActiveSource) {
    engineRef.current?.silence();
    setSource(nextSource);
    setTrail([]);
    if (nextSource === "sample-telemetry") {
      setFish(simulateFishState(0));
      setMessage("Recorded telemetry is running.");
    } else {
      setFish({ ...EMPTY_FISH_STATE, source: nextSource });
      setMessage(
        nextSource === "camera"
          ? "Requesting camera access…"
          : "Sample video ready for aquarium and fish calibration.",
      );
    }
  }

  const handleCameraUnavailable = useCallback((reason: string) => {
    setSource("sample-telemetry");
    setTrail([]);
    setFish(simulateFishState(0));
    setMessage(reason);
  }, []);

  const handleCameraReady = useCallback(() => {
    setMessage("Live camera is ready for aquarium and fish calibration.");
  }, []);

  async function generatePreset() {
    setGenerating(true);
    setMessage("Local Codex is composing a safe sound-and-light preset…");

    try {
      const response = await fetch("/api/preset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = (await response.json()) as PresetResponse | { error: string };
      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Preset request failed.");
      }

      setPreset(data.preset);
      setPresetSource(data.source);
      setModel(data.model);
      setMessage(
        data.warning ??
          `${data.preset.name} is active. Sound and light now share the new local rules.`,
      );
    } catch (error) {
      console.error(error);
      setMessage("Local preset generation failed. The current preset remains active.");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleHue() {
    if (!hueStatus.available || hueBusy) return;
    setHueBusy(true);
    try {
      const response = await fetch("/api/hue", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !hueStatus.enabled }),
      });
      if (!response.ok) throw new Error("Hue toggle failed");
      setHueStatus(await response.json() as HueStatus);
    } catch {
      setHueStatus((status) => ({
        ...status,
        connected: false,
        message: "Hue could not be changed.",
      }));
    } finally {
      setHueBusy(false);
    }
  }

  return (
    <main className="app-shell" style={virtualLightStyle(frame.light)}>
      <div className="virtual-light-wash" aria-hidden="true" />
      <header className="app-header">
        <div>
          <p className="eyebrow">ONE CAMERA · LIVING INSTRUMENT</p>
          <h1>Swimphony</h1>
        </div>
        <div className="header-status">
          <span>Source</span>
          <strong>{SOURCE_LABELS[source]}</strong>
        </div>
      </header>

      <div className="workspace">
        {source === "sample-video" ? (
          <SampleVideoTracker
            fish={fish}
            frame={frame}
            trail={trail}
            onFishState={acceptFishState}
          />
        ) : source === "camera" ? (
          <LiveCameraTracker
            fish={fish}
            frame={frame}
            trail={trail}
            onFishState={acceptFishState}
            onCameraUnavailable={handleCameraUnavailable}
            onCameraReady={handleCameraReady}
          />
        ) : (
          <AquariumStage fish={fish} frame={frame} trail={trail} />
        )}

        <aside className="control-panel">
          <section className="panel-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">PERFORMANCE</span>
                <h2>{preset.name}</h2>
              </div>
              <span className="source-badge">{presetSource}</span>
            </div>
            <p className="preset-description">{preset.description}</p>

            <div className="source-switcher" aria-label="Tracking source">
              <button
                type="button"
                data-active={source === "sample-telemetry"}
                onClick={() => selectSource("sample-telemetry")}
              >
                Demo telemetry
              </button>
              <button
                type="button"
                data-active={source === "sample-video"}
                onClick={() => selectSource("sample-video")}
              >
                Sample video
              </button>
              <button
                type="button"
                data-active={source === "camera"}
                onClick={() => selectSource("camera")}
              >
                Live camera
              </button>
            </div>

            <div className="button-row audio-row">
              <button className="primary-button" onClick={toggleAudio} type="button">
                {audioActive ? "Stop audio" : "Start audio"}
              </button>
              <div className="live-output" data-active={audioActive}>
                <span>{frame.note ?? "—"}</span>
                <strong>{audioActive ? "Audio live" : "Audio ready"}</strong>
              </div>
            </div>
          </section>

          <section className="panel-section conductor-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">LOCAL CODEX</span>
                <h2>Codex Conductor</h2>
              </div>
              <span className="model-label">{model}</span>
            </div>

            <label className="prompt-label" htmlFor="mood-prompt">
              Describe the sound and ambient light
            </label>
            <textarea
              id="mood-prompt"
              value={prompt}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setPrompt(event.target.value)
              }
              rows={5}
            />

            <div className="prompt-chips" aria-label="Example prompts">
              {SAMPLE_PROMPTS.map((sample, index) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setPrompt(sample)}
                >
                  0{index + 1}
                </button>
              ))}
            </div>

            <button
              className="generate-button"
              onClick={generatePreset}
              disabled={generating || prompt.trim().length === 0}
              type="button"
            >
              {generating ? "Composing locally…" : "Compose local performance"}
            </button>
          </section>

          <section className="panel-section compact-section">
            <div className="light-now">
              <div
                className="light-swatch"
                style={{
                  backgroundColor: `hsl(${frame.light.hue} ${frame.light.saturation}% ${frame.light.brightness}%)`,
                }}
              />
              <div>
                <span className="section-kicker">VIRTUAL LIGHT</span>
                <strong>{Math.round(frame.light.hue)}° · {Math.round(frame.light.brightness)}%</strong>
              </div>
              <span className="light-state">{fish.detected ? "Following fish" : "Neutral fade"}</span>
            </div>
            <div className="hue-connection" data-connected={hueStatus.connected}>
              <div>
                <span className="section-kicker">PHILIPS HUE</span>
                <p>{hueStatus.message}</p>
              </div>
              <button
                type="button"
                onClick={toggleHue}
                disabled={!hueStatus.available || hueBusy}
              >
                {hueBusy ? "Checking…" : hueStatus.enabled ? "Disable" : "Enable"}
              </button>
            </div>
            <span className="section-kicker">CURRENT MAPPING</span>
            <dl className="mapping-list">
              <div>
                <dt>Horizontal</dt>
                <dd>{MAPPING_LABELS.horizontal[preset.mapping.horizontal]}</dd>
              </div>
              <div>
                <dt>Vertical</dt>
                <dd>{MAPPING_LABELS.vertical[preset.mapping.vertical]}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{MAPPING_LABELS.speed[preset.mapping.speed]}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>Safety fade</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <footer className="app-footer">
        <p>{message}</p>
        <div>
          <span>Hue</span>
          <strong>{hueStatus.enabled && hueStatus.connected ? "Room light live" : "Virtual only"}</strong>
        </div>
      </footer>
    </main>
  );
}
