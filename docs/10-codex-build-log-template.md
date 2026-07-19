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
- Known limitations: Chrome was checked; Safari remains untested. Camera denial fallback is implemented but the denial branch was not manually forced after permission was granted.
- Follow-up: Camera choice, ROI, and fish color are now validated and saved in browser-local storage. Full reload restores the Switch camera and starts tracking automatically. The camera frame now uses its real 4:3 aspect ratio, fixing click-to-source coordinate drift. Dark-scene initialization is anchored to the sampled point. Browser audio still requires one user click after reload.
- Commit hash: `abaaf03`

## Phase 3: GPT-5.6 AI Conductor

- Prompt used: `prompts/03-phase3-ai-conductor.md`
- Files changed: `src/app/api/preset/route.ts`, `src/lib/performance/codex-conductor.ts`, `src/lib/performance/codex-conductor.test.ts`, `src/lib/performance/preset-schema.ts`, `src/lib/performance/preset-schema.test.ts`, `src/lib/performance/preset-json-schema.ts`, `src/lib/performance/default-preset.ts`, `src/lib/performance/mapper.ts`, `src/lib/performance/mapper.test.ts`, `src/components/SwimphonyConsole.tsx`, `.env.example`, `README.md`, `MANIFEST.md`, `docs/03-architecture.md`, `docs/09-decision-log.md`, `docs/12-openai-setup.md`, `package.json`, `package-lock.json`
- Model ID: `gpt-5.6-terra`, low reasoning, through a short-lived local Codex App Server using the existing ChatGPT login. No separate API key.
- Example prompts tested: A quiet midnight aquarium produced `深夜の水槽`; a warm morning produced `金色の朝`; a playful 8-bit request produced `8-bit水紋`. A fourth browser test produced `朝の水槽` and updated the live mapping while audio was running.
- Validation and safety decisions: Private stdio only; ephemeral thread; read-only sandbox; approvals disabled; 800-character prompt limit; 45-second timeout; structured JSON Schema output; final Zod validation; conservative brightness, transition, density, and gain limits; built-in fallback when Codex is unavailable or invalid.
- Codex contribution: Replaced the separate OpenAI API dependency with the local Codex App Server, added schema-constrained performance composition, made fish-to-sound/light mappings configurable, updated the conductor UI and local setup documents, and added protocol, schema, and mapper tests.
- Browser check: Nintendo Switch Camera remained selected, audio remained live, and the generated preset appeared as `codex-local` with model `gpt-5.6-terra`. The only console error was a missing optional `favicon.ico`.
- Known limitations: Codex App Server is experimental and intended for local use. It is not exposed publicly. Generation requires the local Codex CLI to be signed in; the safe built-in preset remains available otherwise.
- Commit hash: `35d0164`

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

### Genre groove accompaniment

- Files changed: `src/lib/audio/tone-engine.ts`, `src/lib/performance/groove-pattern.ts`, `src/lib/performance/groove-pattern.test.ts`
- Commands run: `npm run lint`, `npm test`, `npm run build`, `git diff --check`
- Codex contribution: Added continuous genre-specific kick, bass, and hi-hat foundations while retaining the existing fish-only Original mode. In genre modes, the original fish performance is lifted into a lead register over the groove; fish position changes the bass pitch and fish energy changes groove intensity.
- Human product/design decision: A song should continue when the fish pauses; the fish conducts and solos over the music instead of being responsible for every note.
- Verification: 12 test files and 46 tests passed; lint and production build passed. A Tone.js filter automation error found during browser startup was removed. Final listening balance remains a human review step.
- Commit hash: `edc35e4`

### Selectable light motion

- Files changed: `src/components/SwimphonyConsole.tsx`, `src/app/globals.css`, `src/lib/lighting/light-motion.ts`, `src/lib/lighting/light-motion.test.ts`, `src/lib/lighting/virtual-light.ts`
- Commands run: `npm run lint`, `npm test`, `npm run build`, `git diff --check`
- Codex contribution: Added Flow, Color Steps, and Beat Palette light-motion presets. The stepped modes use discrete musical color changes while holding brightness stable and retaining the Hue safety floor for transitions.
- Human product/design decision: Keep the original smooth room-light behavior and add clearly visible color-step alternatives for performance and submission footage.
- Verification: 13 test files and 49 tests passed; lint and production build passed.
- Commit hash: `3b4df1c`
- Follow-up: Beat Palette now changes hue once per BPM beat with an 80 ms color transition; Color Steps uses 220 ms transitions. Both hold brightness at 82% to avoid brightness flashing. Hue and browser update limits were adjusted only for these color-only modes. Verification increased to 50 passing tests. Commit: `c9212e5`.
- Visibility fix: Live tracking confidence had still reduced the stepped modes to roughly 70% brightness and lower saturation. Color Steps and Beat Palette now hold brightness at 100% while tracking is usable; Beat Palette uses a zero-duration hue change and Color Steps uses 120 ms. A read-only bridge check confirmed full Hue brightness (`bri: 254`) and immediate coordinate changes. Commit: `7344f36`.
