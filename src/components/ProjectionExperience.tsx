"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "@/components/ProjectionExperience.module.css";
import {
  isProjectionSignal,
  PROJECTION_CHANNEL,
  PROJECTION_STORAGE_KEY,
  type ProjectionSignal,
} from "@/lib/projection/signal";

type TrailPoint = {
  x: number;
  y: number;
  bornAt: number;
  energy: number;
};

type Ripple = {
  x: number;
  y: number;
  bornAt: number;
};

const TRAIL_LIFETIME = 7_600;

function readSavedSignal(): ProjectionSignal | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROJECTION_STORAGE_KEY) ?? "null");
    return isProjectionSignal(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function drawGoldenTrail(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  trail: TrailPoint[],
  ripples: Ripple[],
  head: { x: number; y: number; angle: number },
  signal: ProjectionSignal | null,
) {
  const mappedHue = signal?.light.hue ?? 42;
  const ambientHue = 108 + Math.sin((mappedHue / 360) * Math.PI * 2) * 12;

  context.fillStyle = `hsl(${ambientHue} 38% 3.8%)`;
  context.fillRect(0, 0, width, height);

  const wash = context.createRadialGradient(
    head.x,
    head.y,
    0,
    head.x,
    head.y,
    Math.max(width, height) * 0.72,
  );
  wash.addColorStop(0, "rgba(49, 80, 54, 0.2)");
  wash.addColorStop(0.42, "rgba(15, 42, 32, 0.11)");
  wash.addColorStop(1, "rgba(1, 8, 7, 0)");
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);

  for (let index = 1; index < trail.length; index += 1) {
    const previous = trail[index - 1];
    const point = trail[index];
    const age = (now - point.bornAt) / TRAIL_LIFETIME;
    if (age >= 1) continue;
    const life = Math.pow(1 - age, 1.7);
    const energy = 0.55 + point.energy * 0.8;

    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.lineCap = "round";
    context.strokeStyle = `rgba(224, 173, 62, ${life * 0.09})`;
    context.lineWidth = (20 + point.energy * 34) * life;
    context.shadowBlur = 28;
    context.shadowColor = "rgba(232, 179, 57, 0.38)";
    context.stroke();

    context.strokeStyle = `rgba(250, 217, 126, ${life * 0.48})`;
    context.lineWidth = Math.max(0.7, (2.2 + energy * 3.2) * life);
    context.shadowBlur = 14;
    context.shadowColor = "rgba(255, 215, 112, 0.82)";
    context.stroke();
  }

  context.shadowBlur = 0;
  for (const ripple of ripples) {
    const age = (now - ripple.bornAt) / 2_800;
    if (age >= 1) continue;
    const radius = 18 + age * Math.min(width, height) * 0.13;
    context.beginPath();
    context.ellipse(ripple.x, ripple.y, radius * 1.45, radius, 0, 0, Math.PI * 2);
    context.strokeStyle = `rgba(244, 203, 104, ${(1 - age) * 0.22})`;
    context.lineWidth = 1.2;
    context.stroke();
  }

  if (!signal?.fish.detected) return;

  context.save();
  context.translate(head.x, head.y);
  context.rotate(head.angle);
  const size = Math.max(13, Math.min(width, height) * 0.023);
  const body = context.createRadialGradient(size * 0.22, -size * 0.2, 0, 0, 0, size * 1.6);
  body.addColorStop(0, "rgba(255, 246, 198, 0.98)");
  body.addColorStop(0.24, "rgba(255, 207, 94, 0.92)");
  body.addColorStop(1, "rgba(212, 128, 27, 0.08)");
  context.fillStyle = body;
  context.shadowBlur = 34;
  context.shadowColor = "rgba(247, 190, 74, 0.92)";
  context.beginPath();
  context.ellipse(0, 0, size * 1.38, size * 0.72, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(244, 184, 67, 0.52)";
  context.beginPath();
  context.moveTo(-size * 1.05, 0);
  context.quadraticCurveTo(-size * 2.15, -size * 1.1, -size * 1.75, 0);
  context.quadraticCurveTo(-size * 2.15, size * 1.1, -size * 1.05, 0);
  context.fill();
  context.restore();
}

export function ProjectionExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signalRef = useRef<ProjectionSignal | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const rippleRef = useRef<Ripple[]>([]);
  const headRef = useRef({ x: 0.5, y: 0.5, angle: 0 });
  const previousAccentRef = useRef(false);
  const lastTrailAtRef = useRef(0);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [signal, setSignal] = useState<ProjectionSignal | null>(null);
  const [connected, setConnected] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const receiveSignal = useCallback((next: ProjectionSignal) => {
    signalRef.current = next;
    setSignal(next);
    setConnected(true);
    if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
    connectionTimerRef.current = setTimeout(() => setConnected(false), 3_000);
    if (next.accent && !previousAccentRef.current && next.fish.detected) {
      rippleRef.current.push({ x: next.fish.x, y: next.fish.y, bornAt: performance.now() });
    }
    previousAccentRef.current = next.accent;
  }, []);

  useEffect(() => {
    const saved = readSavedSignal();
    const savedTimer = saved ? setTimeout(() => receiveSignal(saved), 0) : null;

    const channel = new BroadcastChannel(PROJECTION_CHANNEL);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (isProjectionSignal(event.data)) receiveSignal(event.data);
    };
    return () => {
      if (savedTimer) clearTimeout(savedTimer);
      if (connectionTimerRef.current) clearTimeout(connectionTimerRef.current);
      channel.close();
    };
  }, [receiveSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let frameId = 0;

    const render = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const current = signalRef.current;
      const head = headRef.current;
      const oldX = head.x * width;
      const oldY = head.y * height;
      head.x += ((current?.fish.x ?? 0.5) - head.x) * 0.075;
      head.y += ((current?.fish.y ?? 0.5) - head.y) * 0.075;
      const nextX = head.x * width;
      const nextY = head.y * height;
      if (Math.abs(nextX - oldX) + Math.abs(nextY - oldY) > 0.08) {
        head.angle = Math.atan2(nextY - oldY, nextX - oldX);
      }

      if (current?.fish.detected && now - lastTrailAtRef.current > 38) {
        trailRef.current.push({
          x: nextX,
          y: nextY,
          bornAt: now,
          energy: Math.min(1, current.fish.speed),
        });
        lastTrailAtRef.current = now;
      }
      trailRef.current = trailRef.current.filter((point) => now - point.bornAt < TRAIL_LIFETIME);
      rippleRef.current = rippleRef.current.filter((ripple) => now - ripple.bornAt < 2_800);

      drawGoldenTrail(
        context,
        width,
        height,
        now,
        trailRef.current,
        rippleRef.current,
        { x: nextX, y: nextY, angle: head.angle },
        current,
      );
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4_500);
  }, []);

  useEffect(() => {
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 4_500);
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  async function enterFullscreen() {
    await document.documentElement.requestFullscreen().catch(() => undefined);
    setControlsVisible(false);
  }

  return (
    <main
      className={styles.experience}
      data-controls={controlsVisible}
      onPointerMove={revealControls}
      onPointerDown={revealControls}
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-label="金魚の動きから生まれる金色の光跡" />
      <div className={styles.signature}>
        <span>SWIMPHONY</span>
        <strong>GOLDEN TRAIL</strong>
      </div>
      <div className={styles.live} data-connected={connected && signal?.fish.detected}>
        <span />
        {connected ? signal?.modeLabel : "WAITING FOR SWIMPHONY"}
      </div>
      <div className={styles.note} aria-hidden="true">
        {signal?.audioActive ? signal.note ?? "·" : "·"}
      </div>
      <nav className={styles.controls} aria-label="Projection controls">
        <div>
          <span>VISUAL PRESET 01</span>
          <strong>金色の光跡</strong>
        </div>
        <button type="button" onClick={enterFullscreen}>全画面</button>
        <button type="button" onClick={() => window.close()}>閉じる</button>
      </nav>
    </main>
  );
}
