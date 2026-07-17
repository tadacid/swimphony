# 10. Codex Build Log

Keep this document updated during the primary Codex thread.

## Primary Codex thread

- Thread title: Swimphony handoff and build
- Start date: 2026-07-18
- `/feedback` Session ID:
- Codex model used: Codex desktop session

## Phase 0: starter validation

- Prompt used: `CODEX_MASTER_PROMPT.txt` and the supplied handoff prompt
- Files changed: `.env.local`, `package.json`, `package-lock.json`, `tsconfig.json`, `src/lib/audio/tone-engine.ts`, `src/components/SwimphonyConsole.tsx`
- Commands run: `npm install`, `npm test`, `npm run lint`, `npm run build`, `npm run dev`, `npm run check:ready`
- Codex contribution: Installed dependencies, repaired the ESLint version mismatch, corrected Tone.js node typing, and removed a React lint violation without changing the telemetry behavior.
- Human decisions: A real front-view sample video is still required before Phase 1 can begin.
- Problems and resolutions: ESLint 10 was incompatible with the bundled React plugins, so ESLint 9 was selected. Tone.js custom wrapper types rejected the real PolySynth type, so the adapter now uses Tone.js exported types. Tests, lint, and build pass. Development HTML and API fallback returned successfully; audio and animated browser behavior were not manually verified because Chrome remote debugging was disabled.
- Commit hash: Git was initialized after Phase 0, before the Phase 1 handoff.

## Phase 1: tracking

- Prompt used: `prompts/01-phase1-tracking.md`
- Files changed: `src/lib/tracking/tracking-math.ts`, `src/lib/tracking/canvas-tracker.ts`, `src/lib/tracking/tracking-math.test.ts`, `src/components/SampleVideoTracker.tsx`, `src/components/SwimphonyConsole.tsx`, `src/app/globals.css`, `README.md`, `.gitignore`
- Commands run: H.264 video conversion with `ffmpeg`; `npm test`; `npm run lint`; `npm run build`; `npm run dev`; Chrome manual calibration and tracking check
- Codex contribution: Implemented a Canvas/ImageData tracker, HSV fish-color calibration, motion and continuity scoring, connected components, EMA smoothing, confidence decay, ROI editing, mask preview, contour, trail, metrics, and source switching while preserving telemetry mode.
- Human decisions: Keep the original MOV and generated MP4 outside Git. Use browser-native Canvas processing instead of adding OpenCV.js because the current MVP does not need another runtime dependency.
- Tracking accuracy notes: The provided 51.8-second video was converted to 1280×720 H.264 with location metadata removed. In Chrome, one click on the fish produced a correct contour and the tracker followed it across the aquarium for an observed 17-second run. Confidence remained usable during sampled checks (about 61–77–65%) and position, speed, direction, area, and pitch changed continuously.
- Tuning values: 480px analysis width; 83ms interval (~12Hz); mask threshold 0.42; weights color 0.45, motion 0.25, continuity 0.20, shape 0.10; EMA position 0.34, speed 0.22, area 0.18; four-frame hold; hue tolerance 24 degrees.
- Manual check: Choose Sample video → drag the aquarium ROI → choose Sample fish → click the fish body → inspect Mask → Confirm & track. Verify the contour and trail follow the fish and that confidence falls without crashing if calibration is intentionally moved away from the fish.
- Known limitations: Only Chrome was checked in this phase; a full 5-minute endurance run and Safari check remain. Calibration is in-memory. The MP4 is intentionally ignored by Git for privacy and repository size. Live camera remains Phase 2.
- Commit hash: `2da936a`

## Phase 2: audio and Virtual Light

- Prompt used: `prompts/02-phase2-audio-virtual-light.md`
- Files changed: `src/components/SampleVideoTracker.tsx`, `src/components/SwimphonyConsole.tsx`, `src/lib/audio/tone-engine.ts`, `src/lib/lighting/virtual-light.ts`, `src/lib/tracking/canvas-tracker.ts`, `src/lib/tracking/tracking-math.ts`, `src/lib/tracking/tracking-math.test.ts`, `src/app/globals.css`, `README.md`
- Commands run: `npm run lint`; `npm test`; `npm run build`; Chrome camera, source-switching, audio-start/stop, Virtual Light, and console-log checks
- Codex contribution: Added live-camera permission and device selection, reused the Phase 1 Canvas tracker and calibration flow with camera-sourced `FishState`, added safe fallback to recorded telemetry, separated Tone.js note scheduling from tracking updates, added clean silence/stop behavior and a restrained accent voice, and promoted Virtual Light and current note to visible performance indicators.
- Browser/device check: Chrome recognized the FaceTime HD camera at 640×480 and listed a second camera. The live video clock advanced continuously, then camera → telemetry → sample video switching worked without reload. Audio start/stop state and responsive note/light indicators were verified with no browser warnings or errors. The camera was not aimed at the aquarium, so live-fish contour accuracy still needs an aquarium-side check.
- Human sound/design decisions: The user accepted the sample-video sound as “めちゃくちゃいい感じ”. Phase 2 keeps that calm character and the existing midnight-aquarium visual direction.
- Known limitations: Chrome was checked; Safari remains untested. Camera calibration is in memory. Camera denial fallback is implemented but the denial branch was not manually forced after permission was granted.
- Commit hash: `abaaf03`

## Phase 3: GPT-5.6 AI Conductor

- Prompt used: `prompts/03-phase3-ai-conductor.md`
- Files changed:
- Model ID:
- Example prompts tested:
- Validation and safety decisions:
- Codex contribution:
- Commit hash:

## Phase 4: Hue, if completed

- Prompt used: `prompts/04-phase4-hue.md`
- Files changed:
- Hardware tested:
- Codex contribution:
- Human lighting decisions:
- Known limitations:
- Commit hash:

## Phase 5: polish and submission

- Prompt used: `prompts/05-polish-and-submission.md`
- Accessibility and device tests:
- README/demo work:
- Codex contribution:
- Human product/design decisions:
- Final commit hash:
