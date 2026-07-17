# 03. Architecture

## System overview

```text
Sample MP4 / camera / recorded telemetry
                ↓
          Tracking adapter
                ↓
             FishState
                ↓
        Performance mapper
          ↙      ↓       ↘
      Tone.js  Virtual   Hue adapter
                Light     optional

Mood prompt
    ↓
Next.js server route
    ↓
OpenAI Responses API / GPT-5.6
    ↓
Validated PerformancePreset
    ↓
Performance mapper
```

## Why browser-first

- Camera access, canvas processing, visual overlay, sound, and Virtual Light live in one runtime.
- Sample video and camera can share the same processing pipeline.
- The public demo does not require Python, a local vision server, or WebSocket setup.
- The OpenAI API remains server-side through a Next.js route.

## Shared data contract

Every input source produces the same `FishState`:

```ts
type FishState = {
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
```

This keeps future dual-camera and TrueDepth experiments separate from the performance engine.

## Runtime rates

- Display: browser animation frame
- Tracking: initially 10–15 Hz
- Audio decision rate: event-driven, roughly 2–8 notes per second depending on the preset
- Virtual Light: smooth CSS interpolation
- Hue: at most around one group update per second, with long transitions

## Failure behavior

- No OpenAI key: return a safe built-in preset and show a setup warning
- No camera permission: remain in recorded telemetry or sample-video mode
- Fish lost briefly: hold the previous position, lower confidence, and fade gently
- Fish lost for longer: stop notes and return light toward a neutral state
- Hue unavailable: keep Virtual Light running

## Security

- `OPENAI_API_KEY` and Hue credentials exist only in server environment variables.
- Do not send secrets to client components.
- Do not commit `.env.local`.
- Validate all AI-generated data before use.
- Treat Hue as local-network hardware and avoid exposing its bridge address or key in screenshots.
