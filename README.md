# Swimphony

**Turn a goldfish into a living instrument for sound and ambient light.**

Swimphony is a one-camera web application that tracks a goldfish and converts its movement into generative music and ambient lighting. The submission-first design works with ordinary cameras and includes a virtual-light fallback, so Philips Hue is an enhancement rather than a requirement.

## What is already in this starter

- A working Next.js interface driven by deterministic sample telemetry
- A browser-native sample-video tracker with aquarium ROI, fish-color calibration, mask preview, contour, trail, and confidence fallback
- A shared `FishState` model for camera, video, dual-camera, and future TrueDepth inputs
- A Tone.js audio engine with a tracking-independent note scheduler and clean stop behavior
- A smooth, confidence-aware virtual-light renderer
- A local Codex Conductor that turns natural-language moods into validated sound-and-light presets
- Scope, architecture, testing, demo, and Codex handoff documents
- Reference photos of the actual aquarium
- Phase-by-phase Codex prompts

Live-camera input now shares the same calibration and tracking path as sample video. The Hue bridge connection remains optional and the deterministic telemetry path stays available as a fallback.

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`, press **Start audio**, and the recorded telemetry simulator will drive the sound and virtual light.

The Codex Conductor uses the locally installed Codex CLI and its existing ChatGPT login, so it needs no separate API key. Run `codex login status` to confirm the local session. If Codex is unavailable, Swimphony keeps running with the built-in safe preset.

## Local Codex Conductor

Type a mood in **Codex Conductor** and choose **Compose local performance**. The Next.js server starts a short-lived, read-only Codex App Server session, requests one structured preset, validates it with Zod, then applies its sound, mapping, and light rules. The browser never receives Codex credentials and generated values cannot bypass the aquarium safety limits.

Optional tuning lives in `.env.local`:

```text
SWIMPHONY_CODEX_MODEL=gpt-5.6-terra
SWIMPHONY_CODEX_EFFORT=low
SWIMPHONY_CODEX_TIMEOUT_MS=45000
```

## Sample-video tracking

Place an H.264 MP4 at `public/demo/goldfish-demo.mp4`, then:

1. Choose **Sample video**.
2. Drag a rectangle around the aquarium interior.
3. Choose **Sample fish** and click the orange body of the fish.
4. Check the mask preview.
5. Choose **Confirm & track**.

The tracker runs at about 12 Hz while video playback stays smooth. The supplied project keeps user footage out of Git by default; review privacy and rights before publishing a video.

## Live-camera tracking

1. Choose **Live camera** and allow camera access.
2. Select the intended camera if more than one is connected.
3. Drag the aquarium ROI, sample the fish color, and confirm tracking exactly as in sample-video mode.

If permission is denied or no camera is available, Swimphony returns to the recorded telemetry demo without reloading.

## Begin the Codex build

1. Read [`START_HERE.md`](./START_HERE.md).
2. Open this folder as the Codex project.
3. Paste [`CODEX_MASTER_PROMPT.txt`](./CODEX_MASTER_PROMPT.txt) into the primary Codex thread.
4. Then work through the phase prompts in [`prompts/`](./prompts/), beginning with `01-phase1-tracking.md`.
5. Keep the primary Codex thread and record its `/feedback` Session ID in `docs/10-codex-build-log-template.md`.

## Submission scope

### Required

- One-camera sample-video and live-camera tracking
- Fish position, speed, direction, area, acceleration, and confidence
- Sound generation
- Virtual ambient light
- GPT-5.6 Codex Conductor through the local Codex App Server
- Demo mode and a polished single-screen interface

### Optional

- Local Philips Hue output

### Deferred

- Two-camera 3D tracking
- iPhone TrueDepth
- Multi-fish identity tracking
- Cloud accounts and storage

## Safety

Swimphony observes the fish passively. It must not use flashes, strobes, abrupt high-brightness changes, tapping, chasing, or other stimuli to force movement. Hue output should illuminate the room or wall indirectly rather than shine strongly into the aquarium.
