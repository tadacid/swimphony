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
import {
  ToneEngine,
  type PerformanceLayer,
} from "@/lib/audio/tone-engine";
import { audioReactiveLight } from "@/lib/lighting/audio-reactive-light";
import {
  applyLightMotion,
  LIGHT_MOTION_OPTIONS,
  type LightMotionMode,
} from "@/lib/lighting/light-motion";
import { virtualLightStyle } from "@/lib/lighting/virtual-light";
import { DEFAULT_PRESET } from "@/lib/performance/default-preset";
import { mapFishToPerformance } from "@/lib/performance/mapper";
import {
  MODE_OPTIONS,
  MODE_PRESETS,
  type SoundMode,
} from "@/lib/performance/mode-presets";
import type { PerformancePreset } from "@/lib/performance/preset-schema";
import {
  DEFAULT_VISUAL_PRESET,
  VISUAL_PRESETS,
  type VisualPresetId,
} from "@/lib/projection/presets";
import {
  PROJECTION_CHANNEL,
  PROJECTION_STORAGE_KEY,
  type ProjectionSignal,
} from "@/lib/projection/signal";
import {
  clampBpm,
  MAX_BPM,
  MIN_BPM,
} from "@/lib/performance/song-arrangement";
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
  const [soundMode, setSoundMode] = useState<SoundMode>("original");
  const [performanceLayer, setPerformanceLayer] = useState<PerformanceLayer>("groove-fish");
  const effectivePerformanceLayer: PerformanceLayer = soundMode === "original"
    ? "fish-solo"
    : performanceLayer;
  const [bpmDraft, setBpmDraft] = useState(String(DEFAULT_PRESET.bpm));
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
  const [quitting, setQuitting] = useState(false);
  const [audienceMode, setAudienceMode] = useState(false);
  const [visualPreset, setVisualPreset] = useState<VisualPresetId>(DEFAULT_VISUAL_PRESET);
  const [lightMotion, setLightMotion] = useState<LightMotionMode>("flow");
  const engineRef = useRef<ToneEngine | null>(null);
  const lastHueUpdateRef = useRef(0);
  const quitInitiatedRef = useRef(false);
  const projectionChannelRef = useRef<BroadcastChannel | null>(null);

  const frame = useMemo(
    () => mapFishToPerformance(fish, preset),
    [fish, preset],
  );
  const audioLight = useMemo(
    () => audioReactiveLight(frame, preset, fish.timestamp),
    [fish.timestamp, frame, preset],
  );
  const performanceLight = useMemo(
    () => applyLightMotion(
      audioLight,
      lightMotion,
      fish.timestamp,
      preset.bpm,
    ),
    [audioLight, fish.timestamp, lightMotion, preset.bpm],
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
    const channel = new BroadcastChannel(PROJECTION_CHANNEL);
    projectionChannelRef.current = channel;
    return () => {
      channel.close();
      projectionChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const signal: ProjectionSignal = {
      version: 1,
      sentAt: Date.now(),
      fish: {
        x: fish.x,
        y: fish.y,
        speed: fish.speed,
        direction: fish.direction,
        acceleration: fish.acceleration,
        confidence: fish.confidence,
        detected: fish.detected,
      },
      light: performanceLight,
      note: frame.note,
      accent: frame.accent,
      bpm: preset.bpm,
      modeLabel: MODE_PRESETS[soundMode].label,
      visualPreset,
      audioActive,
    };
    projectionChannelRef.current?.postMessage(signal);
    try {
      localStorage.setItem(PROJECTION_STORAGE_KEY, JSON.stringify(signal));
    } catch {
      // Projection still receives live updates through BroadcastChannel.
    }
  }, [audioActive, fish, frame.accent, frame.note, performanceLight, preset.bpm, soundMode, visualPreset]);

  useEffect(() => {
    if (audioActive) {
      engineRef.current?.applyPreset(preset, soundMode, effectivePerformanceLayer);
    }
  }, [audioActive, effectivePerformanceLayer, preset, soundMode]);

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
    const hueUpdateIntervalMs = lightMotion === "beat-palette" || lightMotion === "party-edge"
      ? 250
      : lightMotion === "color-steps"
        ? 500
        : 1000;
    if (
      lastHueUpdateRef.current > 0 &&
      now - lastHueUpdateRef.current < hueUpdateIntervalMs
    ) return;
    lastHueUpdateRef.current = now;
    void fetch("/api/hue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        light: performanceLight,
        confidence: fish.confidence,
        forceOutput: false,
      }),
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
  }, [fish.confidence, hueStatus.enabled, lightMotion, performanceLight]);

  useEffect(() => {
    return () => engineRef.current?.stop();
  }, []);

  useEffect(() => {
    const resetHueWhenClosing = () => {
      if (quitInitiatedRef.current) return;
      void fetch("/api/hue", { method: "DELETE", keepalive: true });
    };
    window.addEventListener("pagehide", resetHueWhenClosing);
    return () => window.removeEventListener("pagehide", resetHueWhenClosing);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (audienceMode && !document.fullscreenElement) {
        setAudienceMode(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [audienceMode]);

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
      await engine.start(preset, soundMode, effectivePerformanceLayer);
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

  function selectSoundMode(nextMode: SoundMode) {
    const option = MODE_PRESETS[nextMode];
    setSoundMode(nextMode);
    setPreset(option.preset);
    setBpmDraft(String(option.preset.bpm));
    setPresetSource("built-in");
    setModel(`${option.label} mode`);
    setMessage(`${option.preset.name} is active. ${option.cue}.`);
  }

  function selectPerformanceLayer(nextLayer: PerformanceLayer) {
    setPerformanceLayer(nextLayer);
    setMessage(
      nextLayer === "fish-solo"
        ? "Fish Solo restores the original fish-driven performance for this genre."
        : "Groove + Fish layers the fish lead over a continuous genre rhythm.",
    );
  }

  function updateBpm(value: number) {
    const bpm = clampBpm(value);
    setPreset((current) => ({ ...current, bpm }));
    setBpmDraft(String(bpm));
    setMessage(`${bpm} BPM · 16-bar song arrangement is active.`);
  }

  function commitBpm() {
    const parsed = Number(bpmDraft);
    updateBpm(Number.isFinite(parsed) && bpmDraft.trim() ? parsed : preset.bpm);
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
      setBpmDraft(String(data.preset.bpm));
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

  async function resetHueToDefault() {
    if (!hueStatus.available || hueBusy) return;
    setHueBusy(true);
    try {
      const response = await fetch("/api/hue", { method: "DELETE" });
      if (!response.ok) throw new Error("Hue reset failed");
      setHueStatus(await response.json() as HueStatus);
      setMessage("Hue returned to the saved warm-white default at 100% brightness. Sync is off.");
    } catch {
      setHueStatus((status) => ({
        ...status,
        connected: false,
        message: "Hue could not return to default.",
      }));
    } finally {
      setHueBusy(false);
    }
  }

  async function quitApplication() {
    if (quitting) return;
    quitInitiatedRef.current = true;
    setQuitting(true);
    engineRef.current?.stop();
    engineRef.current = null;
    setAudioActive(false);
    setMessage("Swimphonyを終了しています…");
    setHueStatus((status) => ({
      ...status,
      enabled: false,
      message: "Returning Hue to the saved warm-white default at 100%…",
    }));

    try {
      const response = await fetch("/api/shutdown", { method: "POST" });
      if (!response.ok) throw new Error("Shutdown failed");
      window.close();
    } catch {
      quitInitiatedRef.current = false;
      setQuitting(false);
      setMessage("終了できませんでした。もう一度押してください。");
    }
  }

  async function enterAudienceMode() {
    setAudienceMode(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setMessage("Audience display is active inside the current window.");
    }
  }

  async function exitAudienceMode() {
    setAudienceMode(false);
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }
  }

  function openProjection() {
    const projectionWindow = window.open(
      "/projection",
      "swimphony-projection",
      "popup,width=1440,height=900",
    );
    if (!projectionWindow) {
      setMessage("Chromeでポップアップを許可して、もう一度投影画面を開いてください。");
      return;
    }
    projectionWindow.focus();
    setMessage("投影画面を開きました。プロジェクターへ移動して「全画面」を押してください。");
  }

  return (
    <main
      className="app-shell"
      data-audience={audienceMode}
      style={virtualLightStyle(performanceLight, lightMotion)}
    >
      <div className="virtual-light-wash" aria-hidden="true" />
      {audienceMode ? (
        <section className="audience-hud" aria-label="Audience performance display">
          <div className="audience-topline">
            <div>
              <span>SWIMPHONY · LIVING INSTRUMENT</span>
              <strong>{MODE_PRESETS[soundMode].label}</strong>
            </div>
            <div className="audience-live" data-active={fish.detected && audioActive}>
              <span />
              {fish.detected ? "FISH TRACKED" : "WAITING FOR FISH"}
            </div>
            <button type="button" onClick={exitAudienceMode}>
              操作画面へ
            </button>
          </div>

          <div className="audience-output">
            <span>CURRENT NOTE</span>
            <strong>{frame.note ?? "—"}</strong>
            <p>
              {audioActive
                ? `${preset.name} · ${preset.bpm} BPM · 16 BAR FORM`
                : "PRESS START AUDIO BEFORE THE SHOW"}
            </p>
          </div>

          <div className="audience-causality">
            <article data-active={fish.detected}>
              <span>HEIGHT</span>
              <strong>{Math.round((1 - fish.y) * 100)}%</strong>
              <b>→ PITCH</b>
            </article>
            <article data-active={fish.detected && fish.speed > 0.22}>
              <span>SPEED</span>
              <strong>{Math.round(fish.speed * 100)}%</strong>
              <b>→ RHYTHM</b>
            </article>
            <article data-active={frame.accent}>
              <span>TURN</span>
              <strong>{frame.accent ? "ACCENT" : "FLOW"}</strong>
              <b>→ IMPACT</b>
            </article>
            <article data-active={hueStatus.enabled && hueStatus.connected}>
              <span>LIGHT</span>
              <strong>{Math.round(performanceLight.brightness)}%</strong>
              <b>→ HUE</b>
            </article>
          </div>
        </section>
      ) : null}
      <header className="app-header">
        <div>
          <p className="eyebrow">ONE CAMERA · LIVING INSTRUMENT</p>
          <h1>Swimphony</h1>
        </div>
        <div className="header-actions">
          <div className="header-status">
            <span>Source</span>
            <strong>{SOURCE_LABELS[source]}</strong>
          </div>
          <button
            className="audience-button"
            type="button"
            onClick={enterAudienceMode}
          >
            <span aria-hidden="true">◫</span>
            観客表示
          </button>
          <button
            className="projection-button"
            type="button"
            onClick={openProjection}
          >
            <span aria-hidden="true">↗</span>
            投影画面
          </button>
          <button
            className="quit-button"
            type="button"
            onClick={quitApplication}
            disabled={quitting}
            aria-label="Swimphonyを終了"
          >
            <span aria-hidden="true">⏻</span>
            {quitting ? "終了中…" : "アプリ終了"}
          </button>
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

            <div className="mode-heading">
              <span className="section-kicker">MODE PRESETS</span>
              <strong>{MODE_PRESETS[soundMode].cue}</strong>
            </div>
            <div className="mode-switcher" aria-label="Sound mode preset">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-active={soundMode === option.id}
                  onClick={() => selectSoundMode(option.id)}
                  title={option.cue}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="layer-heading">
              <span className="section-kicker">PLAY STYLE</span>
              <strong>
                {effectivePerformanceLayer === "fish-solo" ? "従来の金魚演奏" : "土台の曲＋金魚の上音"}
              </strong>
            </div>
            <div className="layer-switcher" aria-label="Performance layer">
              <button
                type="button"
                data-active={effectivePerformanceLayer === "fish-solo"}
                onClick={() => selectPerformanceLayer("fish-solo")}
              >
                Fish Solo
              </button>
              <button
                type="button"
                data-active={effectivePerformanceLayer === "groove-fish"}
                onClick={() => selectPerformanceLayer("groove-fish")}
                disabled={soundMode === "original"}
                title={soundMode === "original" ? "Original is always fish-only" : undefined}
              >
                Groove + Fish
              </button>
            </div>

            <div className="visual-preset-heading">
              <span className="section-kicker">VISUAL PRESET</span>
              <strong>プロジェクター出力</strong>
            </div>
            <div className="visual-preset-switcher" aria-label="Visual preset">
              {VISUAL_PRESETS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-active={visualPreset === option.id}
                  onClick={() => setVisualPreset(option.id)}
                  title={option.cue}
                >
                  <span>{option.label}</span>
                  <small>{option.cue}</small>
                </button>
              ))}
            </div>

            <div className="light-motion-heading">
              <span className="section-kicker">LIGHT MOTION</span>
              <strong>
                {LIGHT_MOTION_OPTIONS.find((option) => option.id === lightMotion)?.cue}
                {" · 明るさ "}
                {LIGHT_MOTION_OPTIONS.find((option) => option.id === lightMotion)?.brightness}
              </strong>
            </div>
            <div className="light-motion-switcher" aria-label="Light motion preset">
              {LIGHT_MOTION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-active={lightMotion === option.id}
                  onClick={() => {
                    setLightMotion(option.id);
                    setMessage(`${option.label} light motion is active. ${option.cue}.`);
                  }}
                  title={option.cue}
                  aria-label={`${option.label}: ${option.cue}, 明るさ ${option.brightness}`}
                >
                  <span>{option.label}</span>
                  <small>{option.brightness}</small>
                </button>
              ))}
            </div>

            <div className="tempo-control">
              <div>
                <span className="section-kicker">TEMPO</span>
                <strong>16 BAR SONG FORM</strong>
              </div>
              <button
                type="button"
                onClick={() => updateBpm(preset.bpm - 1)}
                aria-label="BPMを1下げる"
              >
                −
              </button>
              <label>
                <input
                  type="number"
                  min={MIN_BPM}
                  max={MAX_BPM}
                  step={1}
                  value={bpmDraft}
                  onChange={(event) => setBpmDraft(event.target.value)}
                  onBlur={commitBpm}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  aria-label="BPM"
                />
                <span>BPM</span>
              </label>
              <button
                type="button"
                onClick={() => updateBpm(preset.bpm + 1)}
                aria-label="BPMを1上げる"
              >
                +
              </button>
            </div>

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
                  backgroundColor: `hsl(${performanceLight.hue} ${performanceLight.saturation}% ${performanceLight.brightness}%)`,
                }}
              />
              <div>
                <span className="section-kicker">VIRTUAL LIGHT</span>
                <strong>{Math.round(performanceLight.hue)}° · {Math.round(performanceLight.brightness)}%</strong>
              </div>
              <span className="light-state">{fish.detected ? "Following sound + fish" : "Neutral fade"}</span>
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
            <button
              className="hue-default-button"
              type="button"
              onClick={resetHueToDefault}
              disabled={!hueStatus.available || hueBusy}
            >
              <span>DEFAULT LIGHT</span>
              <strong>いつもの暖色 · 明るさ100%</strong>
            </button>
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
